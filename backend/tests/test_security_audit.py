"""
backend/tests/test_security_audit.py
Verificación de mitigaciones de seguridad tras la auditoría (/security-audit)
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app
import os

client = TestClient(app)


def test_sql_injection_defense_kpis():
    """Valida que un ataque SQL injection en /api/kpis no genere error 500 ni ejecute payloads."""
    payloads = [
        "alquiler' OR 1=1 --",
        "venta' UNION SELECT 1,2,3,4,5,6,7,8,9,10,11,12,13 --",
        "'; DROP TABLE Fact_Operacion; --",
    ]
    for p in payloads:
        res = client.get(f"/api/kpis?year=2024&month=Enero&op={p}&district=Todos&barrio=Todos")
        assert res.status_code == 200, f"Fallo con payload {p}"
        data = res.json()
        assert "precio_m2" in data


def test_sql_injection_defense_series():
    """Valida que una inyección en zona_nombre sea tratada como literal y no rompa la consulta."""
    res = client.get("/api/series?year=2024&op=Venta&zona=Centro'%20OR%20'1'='1&tipo_zona=distrito")
    assert res.status_code == 200
    assert res.json() == []


def test_sql_injection_defense_rankings():
    """Valida saneamiento en los filtros de rankings."""
    res = client.get("/api/rankings?year=2024&month=Enero&op=alquiler'&level=barrio&category=Precio&district=Salamanca'%20OR%201=1--")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_confirmar_sesion_endpoint():
    """Prueba el endpoint de confirmacion de sesion de pago."""
    # Sesion no valida
    res_bad = client.get("/api/veredicto/confirmar-sesion?session_id=fake_session_123")
    assert res_bad.status_code in [400, 402]

    # Sesion simulada en entorno de pruebas
    datos = {"precio": 350000, "metros": 80, "barrio": "Goya", "operacion": "Venta"}
    from backend.services.payment_service import generar_token_descarga
    tok = generar_token_descarga(datos)
    res_sim = client.get(f"/api/veredicto/confirmar-sesion?session_id=sim_test_{tok}")
    assert res_sim.status_code == 200
    data = res_sim.json()
    assert data["status"] == "ok"
    assert "token" in data


def test_debug_path_restricted_in_production(monkeypatch):
    """Verifica que el endpoint /api/debug-path retorne 404 cuando ENVIRONMENT=production."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    res = client.get("/api/debug-path")
    assert res.status_code == 404
