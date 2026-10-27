"""
backend/tests/test_api_veredicto.py
Pruebas para los endpoints de la API de El Veredicto
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_endpoint_veredicto_evaluar_valido():
    payload = {
        "precio": 500000,
        "metros": 75,
        "barrio": "Goya",
        "operacion": "Venta"
    }
    response = client.post("/api/veredicto/evaluar", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "estado" in data
    assert data["estado"] in ["CARO", "EN_LINEA", "BARATO"]
    assert data["barrio_nombre"] == "Goya"
    assert data["precio_m2_inmueble"] > 0
    assert "resumen_argumentos" in data
    assert len(data["resumen_argumentos"]) > 0


def test_endpoint_veredicto_evaluar_incompleto_retorna_400():
    payload = {
        "precio": 300000
    }
    response = client.post("/api/veredicto/evaluar", json=payload)
    assert response.status_code == 400


def test_endpoint_extraer_url():
    payload = {
        "url": "https://www.idealista.com/inmueble/99999999/"
    }
    response = client.post("/api/veredicto/extraer-url", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "requiere_manual" in data
