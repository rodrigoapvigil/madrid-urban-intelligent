"""
backend/tests/test_payment_service.py
Pruebas para el servicio de pagos de Stripe y descarga de dossiers
"""
import pytest
from fastapi.testclient import TestClient
from backend.services.payment_service import (
    generar_token_descarga,
    verificar_token_descarga,
    crear_sesion_checkout
)
from backend.main import app

client = TestClient(app)


def test_token_descarga_ciclo_de_vida():
    datos = {"precio": 450000, "metros": 80, "barrio": "Goya", "operacion": "Venta"}
    token = generar_token_descarga(datos, expira_en_segundos=3600)
    assert token is not None
    assert len(token) > 20

    # Verificar token valido
    recuperados = verificar_token_descarga(token)
    assert recuperados is not None
    assert recuperados["barrio"] == "Goya"
    assert recuperados["precio"] == 450000


def test_token_descarga_expirado():
    datos = {"precio": 300000, "metros": 60, "barrio": "Almagro"}
    # Token expirado (-10 segundos)
    token = generar_token_descarga(datos, expira_en_segundos=-10)
    recuperados = verificar_token_descarga(token)
    assert recuperados is None


def test_crear_sesion_checkout_modo_simulado():
    datos = {"precio": 350000, "metros": 75, "barrio": "Trafalgar"}
    sesion = crear_sesion_checkout(
        tipo="dossier",
        datos_inmueble=datos,
        success_url="http://localhost:3000/madrid/veredicto",
        cancel_url="http://localhost:3000/madrid/veredicto"
    )
    assert "url" in sesion
    assert "session_id" in sesion


def test_endpoint_crear_sesion_pago_y_descarga():
    # 1. Crear sesion
    payload = {
        "tipo": "dossier",
        "datos_inmueble": {"precio": 400000, "metros": 70, "barrio": "Goya", "operacion": "Venta"},
        "success_url": "http://localhost:3000/madrid/veredicto",
        "cancel_url": "http://localhost:3000/madrid/veredicto"
    }
    res = client.post("/api/veredicto/crear-sesion-pago", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "url" in data

    token = data.get("token_directo")
    if token:
        # 2. Probar descarga de PDF con el token
        res_pdf = client.get(f"/api/veredicto/descargar-dossier?token={token}")
        assert res_pdf.status_code == 200
        assert res_pdf.headers["content-type"] == "application/pdf"
        assert res_pdf.content.startswith(b"%PDF-")


def test_endpoint_descarga_token_invalido():
    res = client.get("/api/veredicto/descargar-dossier?token=token_falso_invalido")
    assert res.status_code == 403
