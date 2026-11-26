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


def test_simulation_bypass_blocked_in_production(monkeypatch):
    """En produccion no se permite confirmar sesiones simuladas sim_test_."""
    from backend.services.payment_service import generar_token_descarga
    tok = generar_token_descarga({"precio": 350000, "metros": 80, "barrio": "Goya", "operacion": "Venta"})
    monkeypatch.setenv("ENVIRONMENT", "production")
    res = client.get(f"/api/veredicto/confirmar-sesion?session_id=sim_test_{tok}")
    assert res.status_code == 402


def test_simulation_rejects_unverified_token():
    """Incluso en desarrollo, sim_test_ con token arbitrario no firmado debe rechazarse."""
    res = client.get("/api/veredicto/confirmar-sesion?session_id=sim_test_token_falso_123")
    assert res.status_code == 402


def test_webhook_requires_secret_in_production(monkeypatch):
    """En produccion sin STRIPE_WEBHOOK_SECRET el webhook debe rechazar la peticion."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    res = client.post(
        "/api/veredicto/webhook",
        data='{"type": "checkout.session.completed"}',
        headers={"Content-Type": "application/json"},
    )
    assert res.status_code == 400


def test_open_redirect_blocked_in_checkout():
    """Bloquea URLs de retorno externas no autorizadas en crear-sesion-pago."""
    payload = {
        "tipo": "dossier",
        "datos_inmueble": {"precio": 350000, "metros": 80, "barrio": "Goya", "operacion": "Venta"},
        "success_url": "https://evil-attacker.example.com/steal",
        "cancel_url": "https://dmiyc.com/madrid/veredicto",
    }
    res = client.post("/api/veredicto/crear-sesion-pago", json=payload)
    assert res.status_code == 400


def test_security_headers_and_hsts_in_production(monkeypatch):
    """Verifica cabeceras de seguridad HTTP y HSTS en produccion."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    res = client.get("/api/health")
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert res.headers.get("Content-Security-Policy") == "default-src 'none'; frame-ancestors 'none'"
    assert "max-age=31536000" in (res.headers.get("Strict-Transport-Security") or "")


def test_chat_input_length_validation():
    """Rechaza mensajes excesivamente largos en /api/chat (anti-DoS)."""
    res = client.post(
        "/api/chat",
        json={"message": "A" * 2500, "session_id": "test-session"},
    )
    assert res.status_code == 422


def test_ssrf_blocks_private_and_non_whitelisted_urls():
    """Bloquea SSRF hacia localhost, metadatos cloud o dominios no autorizados."""
    for bad_url in [
        "http://127.0.0.1:8000/api/health",
        "http://169.254.169.254/latest/meta-data/",
        "https://evil.example.com/inmueble",
    ]:
        res = client.post("/api/veredicto/extraer-url", json={"url": bad_url})
        assert res.status_code == 200
        assert res.json()["requiere_manual"] is True


def test_rate_limiting_returns_429():
    """Verifica que el rate limiter devuelva 429 al superar el umbral en /api/chat."""
    headers = {"X-Forwarded-For": "198.51.100.77"}
    statuses = []
    for _ in range(22):
        r = client.post(
            "/api/chat",
            json={"message": "hola", "session_id": "rl-test"},
            headers=headers,
        )
        statuses.append(r.status_code)
    assert 429 in statuses
