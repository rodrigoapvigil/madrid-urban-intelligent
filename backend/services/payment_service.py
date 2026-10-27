"""
backend/services/payment_service.py
Servicio de integracion con Stripe Checkout para micropagos (4,90 €)
y suscripcion mensual (19 €/mes), con generacion de tokens seguros de descarga.
"""
import os
import hmac
import hashlib
import json
import time
from typing import Optional, Dict, Any, Tuple
import stripe

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
DOWNLOAD_TOKEN_SECRET = os.getenv("DOWNLOAD_TOKEN_SECRET", "mui_token_secret_salt_2026")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Almacen en memoria temporal de tokens validos de descarga (token -> datos_inmueble)
# En produccion persistible en BD analitica o Redis
_TOKEN_STORE: Dict[str, Dict[str, Any]] = {}


def generar_token_descarga(datos_inmueble: Dict[str, Any], expira_en_segundos: int = 86400) -> str:
    """
    Genera un token firmado HMAC con caducidad (24 horas por defecto)
    y almacena la instantanea de los datos para compilar el PDF al descargar.
    """
    timestamp = int(time.time())
    expira = timestamp + expira_en_segundos
    mensaje = f"{datos_inmueble.get('barrio', '')}-{datos_inmueble.get('precio', 0)}-{expira}"
    firma = hmac.new(
        DOWNLOAD_TOKEN_SECRET.encode("utf-8"),
        mensaje.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    token = f"{firma[:32]}_{expira}"
    _TOKEN_STORE[token] = {
        "datos": datos_inmueble,
        "expira": expira,
        "usos": 0
    }
    return token


def verificar_token_descarga(token: str) -> Optional[Dict[str, Any]]:
    """
    Valida si el token es autentico, no ha expirado y devuelve los datos del inmueble.
    """
    if not token or token not in _TOKEN_STORE:
        return None

    registro = _TOKEN_STORE[token]
    ahora = int(time.time())
    if ahora > registro["expira"]:
        del _TOKEN_STORE[token]
        return None

    registro["usos"] += 1
    return registro["datos"]


def crear_sesion_checkout(
    tipo: str,
    datos_inmueble: Dict[str, Any],
    success_url: str,
    cancel_url: str
) -> Dict[str, str]:
    """
    Crea una sesion de Stripe Checkout para:
    - tipo='dossier': Micropago de 4,90 € (490 centimos)
    - tipo='suscripcion': Suscripcion recurrente de 19,00 €/mes
    Si STRIPE_SECRET_KEY no esta configurada, opera en modo simulacion seguro para pruebas locales.
    """
    # Si no hay clave de Stripe configurada (desarrollo local / CI), devolver sesion simulada
    if not STRIPE_SECRET_KEY:
        token_simulado = generar_token_descarga(datos_inmueble)
        simulated_url = f"{success_url}?session_id=sim_test_{token_simulado}&token={token_simulado}"
        return {
            "url": simulated_url,
            "session_id": f"sim_test_{token_simulado}",
            "token_directo": token_simulado
        }

    if tipo == "suscripcion":
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "product_data": {
                        "name": "Suscripción Pro Inversor — Madrid Urban Intelligence",
                        "description": "Acceso ilimitado a veredictos y descargas de dossiers oficiales de negociación",
                    },
                    "unit_amount": 1900,
                    "recurring": {"interval": "month"},
                },
                "quantity": 1,
            }],
            mode="subscription",
            success_url=f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=cancel_url,
            metadata={"tipo": "suscripcion"}
        )
    else:
        # Micropago unico de 4,90 €
        token = generar_token_descarga(datos_inmueble)
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "product_data": {
                        "name": "Dossier Oficial de Negociación — Madrid Urban Intelligence",
                        "description": f"Informe detallado con series oficiales de cierre en {datos_inmueble.get('barrio', 'Madrid')}",
                    },
                    "unit_amount": 490,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}&token={token}",
            cancel_url=cancel_url,
            metadata={
                "tipo": "dossier",
                "token": token,
                "barrio": str(datos_inmueble.get("barrio", ""))
            }
        )

    return {
        "url": session.url,
        "session_id": session.id
    }


def procesar_webhook_stripe(payload_bytes: bytes, sig_header: str) -> Dict[str, Any]:
    """
    Verifica la firma criptografica de un evento recibido de Stripe.
    """
    if not STRIPE_WEBHOOK_SECRET:
        # En ausencia de secreto (pruebas locales), procesar decodificando el payload
        event = json.loads(payload_bytes.decode("utf-8"))
        return {"status": "ok", "event_type": event.get("type")}

    event = stripe.Webhook.construct_event(
        payload_bytes, sig_header, STRIPE_WEBHOOK_SECRET
    )
    return {"status": "ok", "event_type": event["type"], "id": event["id"]}
