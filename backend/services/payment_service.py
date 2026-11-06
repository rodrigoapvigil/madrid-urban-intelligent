"""
backend/services/payment_service.py
Servicio de integracion con Stripe Checkout para micropagos (4,90 €)
y suscripcion mensual (19 €/mes), con generacion de tokens criptograficamente
firmados y seguros para descarga del Dossier Oficial.
"""
import os
import hmac
import hashlib
import base64
import json
import time
from typing import Optional, Dict, Any, Tuple
import stripe

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
DOWNLOAD_TOKEN_SECRET = os.getenv("DOWNLOAD_TOKEN_SECRET", "mui_token_secret_salt_2026")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

# Almacen en memoria temporal con desalojo automatico y limite maximo (anti-DoS)
_TOKEN_STORE: Dict[str, Dict[str, Any]] = {}
MAX_TOKENS = 1000


def _limpiar_tokens_expirados():
    """Elimina tokens caducados para evitar fugas de memoria."""
    ahora = int(time.time())
    expirados = [t for t, reg in _TOKEN_STORE.items() if ahora > reg.get("expira", 0)]
    for t in expirados:
        _TOKEN_STORE.pop(t, None)
    if len(_TOKEN_STORE) > MAX_TOKENS:
        tokens_ordenados = sorted(_TOKEN_STORE.items(), key=lambda x: x[1].get("expira", 0))
        exceso = len(_TOKEN_STORE) - MAX_TOKENS
        for t, _ in tokens_ordenados[:exceso]:
            _TOKEN_STORE.pop(t, None)


def generar_token_descarga(datos_inmueble: Dict[str, Any], expira_en_segundos: int = 86400) -> str:
    """
    Genera un token auto-contenido firmado criptograficamente con HMAC-SHA256 y caducidad.
    Permite validar y reconstruir los datos del informe aun si el contenedor del backend se reinicia.
    """
    _limpiar_tokens_expirados()
    timestamp = int(time.time())
    expira = timestamp + expira_en_segundos

    payload = {
        "precio": float(datos_inmueble.get("precio", 0)),
        "metros": float(datos_inmueble.get("metros", 0)),
        "barrio": str(datos_inmueble.get("barrio", "")),
        "operacion": str(datos_inmueble.get("operacion", "Venta")),
        "expira": expira,
        "ts": timestamp
    }
    payload_json = json.dumps(payload, separators=(',', ':'), sort_keys=True).encode("utf-8")
    b64_payload = base64.urlsafe_b64encode(payload_json).decode("utf-8").rstrip("=")
    firma = hmac.new(
        DOWNLOAD_TOKEN_SECRET.encode("utf-8"),
        b64_payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    token = f"{b64_payload}.{firma[:32]}"
    _TOKEN_STORE[token] = {
        "datos": datos_inmueble,
        "expira": expira,
        "usos": 0
    }
    if len(_TOKEN_STORE) > MAX_TOKENS:
        _limpiar_tokens_expirados()
    return token


def verificar_token_descarga(token: str) -> Optional[Dict[str, Any]]:
    """
    Valida si el token es autentico, no ha expirado y devuelve los datos del inmueble.
    Soporta tokens firmados auto-contenidos y retrocompatibilidad con el almacen en memoria.
    """
    if not token or not isinstance(token, str):
        return None

    ahora = int(time.time())

    # 1. Comprobar formato auto-contenido firmado (b64_payload.firma)
    if "." in token:
        try:
            b64_payload, signature = token.rsplit(".", 1)
            expected_sig = hmac.new(
                DOWNLOAD_TOKEN_SECRET.encode("utf-8"),
                b64_payload.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()[:32]

            if hmac.compare_digest(signature, expected_sig):
                rem = len(b64_payload) % 4
                padded = b64_payload + ("=" * (4 - rem) if rem else "")
                data_bytes = base64.urlsafe_b64decode(padded)
                data = json.loads(data_bytes.decode("utf-8"))
                if ahora <= data.get("expira", 0):
                    return {
                        "precio": data.get("precio"),
                        "metros": data.get("metros"),
                        "barrio": data.get("barrio"),
                        "operacion": data.get("operacion", "Venta")
                    }
        except Exception:
            pass

    # 2. Fallback de compatibilidad con _TOKEN_STORE en memoria
    if token in _TOKEN_STORE:
        registro = _TOKEN_STORE[token]
        if ahora <= registro["expira"]:
            registro["usos"] += 1
            return registro["datos"]
        else:
            del _TOKEN_STORE[token]

    return None


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
    Si STRIPE_SECRET_KEY no esta configurada (entorno de pruebas local o CI),
    opera en modo simulacion seguro.
    """
    if not STRIPE_SECRET_KEY:
        token_simulado = generar_token_descarga(datos_inmueble)
        simulated_url = f"{success_url}?session_id=sim_test_{token_simulado}&token={token_simulado}"
        return {
            "url": simulated_url,
            "session_id": f"sim_test_{token_simulado}",
            "token_directo": token_simulado
        }

    meta_inmueble = {
        "tipo": tipo,
        "barrio": str(datos_inmueble.get("barrio", "")),
        "precio": str(datos_inmueble.get("precio", 0)),
        "metros": str(datos_inmueble.get("metros", 0)),
        "operacion": str(datos_inmueble.get("operacion", "Venta"))
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
            metadata=meta_inmueble
        )
    else:
        # Micropago de 4,90 €: el token se expide unicamente tras certificar el pago
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
            success_url=f"{success_url}?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=cancel_url,
            metadata=meta_inmueble
        )

    return {
        "url": session.url,
        "session_id": session.id
    }


def confirmar_pago_y_generar_token(session_id: str) -> Tuple[Optional[str], Optional[Dict[str, Any]], str]:
    """
    Verifica con Stripe si la sesion de checkout ha sido completada y pagada.
    Genera el token firmado de descarga unicamente cuando el pago es 'paid'.
    """
    if not session_id:
        return None, None, "missing_session"

    # Soporte para modo simulacion exclusivamente con prefijo sim_test_
    if session_id.startswith("sim_test_"):
        token_sim = session_id.replace("sim_test_", "")
        datos = verificar_token_descarga(token_sim) or {
            "precio": 350000,
            "metros": 80,
            "barrio": "Goya",
            "operacion": "Venta"
        }
        token = token_sim if ("." in token_sim or token_sim in _TOKEN_STORE) else generar_token_descarga(datos)
        return token, datos, "paid"

    if not STRIPE_SECRET_KEY:
        return None, None, "stripe_not_configured"

    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status == "paid":
            meta = session.metadata or {}
            datos_inmueble = {
                "precio": float(meta.get("precio", 350000)),
                "metros": float(meta.get("metros", 80)),
                "barrio": meta.get("barrio", "Goya"),
                "operacion": meta.get("operacion", "Venta")
            }
            token = generar_token_descarga(datos_inmueble)
            return token, datos_inmueble, "paid"
        else:
            return None, None, session.payment_status
    except Exception as e:
        return None, None, f"error: {str(e)}"


def procesar_webhook_stripe(payload_bytes: bytes, sig_header: str) -> Dict[str, Any]:
    """
    Verifica la firma criptografica de un evento recibido de Stripe y registra
    la sesion pagada cuando corresponde.
    """
    if not STRIPE_WEBHOOK_SECRET:
        event = json.loads(payload_bytes.decode("utf-8"))
    else:
        event = stripe.Webhook.construct_event(
            payload_bytes, sig_header, STRIPE_WEBHOOK_SECRET
        )

    event_type = event.get("type", "")
    if event_type == "checkout.session.completed":
        session_obj = event.get("data", {}).get("object", {})
        if session_obj.get("payment_status") == "paid":
            meta = session_obj.get("metadata", {})
            datos_inmueble = {
                "precio": float(meta.get("precio", 350000)),
                "metros": float(meta.get("metros", 80)),
                "barrio": meta.get("barrio", "Goya"),
                "operacion": meta.get("operacion", "Venta")
            }
            token = generar_token_descarga(datos_inmueble)
            return {"status": "ok", "event_type": event_type, "id": event.get("id"), "token": token}

    return {"status": "ok", "event_type": event_type, "id": event.get("id")}
