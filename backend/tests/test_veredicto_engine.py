"""
backend/tests/test_veredicto_engine.py
Pruebas unitarias para el motor analítico de El Veredicto
"""
import pytest
from backend.services.veredicto_engine import (
    evaluar_inmueble,
    VeredictoRequest,
    VeredictoResponse,
    normalizar_texto
)


def test_normalizar_texto():
    assert normalizar_texto("Chamberí") == "chamberi"
    assert normalizar_texto("San Blas - Canillejas") == "san blas - canillejas"
    assert normalizar_texto("  ALMAGRO  ") == "almagro"


def test_evaluar_inmueble_caro():
    # En Goya la media ronda 10.390 €/m2; a 15.000 €/m2 debe ser CARO
    res = evaluar_inmueble(precio=1200000, metros=80, zona_str="Goya", operacion="Venta")
    assert isinstance(res, VeredictoResponse)
    assert res.estado == "CARO"
    assert res.desviacion_pct_barrio > 8.0
    assert res.margen_negociacion_estimado_eur > 0
    assert res.barrio_nombre == "Goya"
    assert res.distrito_nombre == "Salamanca"
    assert len(res.resumen_argumentos) >= 3


def test_evaluar_inmueble_barato():
    # En Goya a 5.000 €/m2 debe ser BARATO
    res = evaluar_inmueble(precio=400000, metros=80, zona_str="Goya", operacion="Venta")
    assert isinstance(res, VeredictoResponse)
    assert res.estado == "BARATO"
    assert res.desviacion_pct_barrio < -8.0
    assert res.precio_justo_estimado_eur > 400000


def test_evaluar_inmueble_en_linea():
    # En Goya a 10.000 €/m2 (~ -3.75% de 10.390) debe ser EN_LINEA
    res = evaluar_inmueble(precio=800000, metros=80, zona_str="Goya", operacion="Venta")
    assert isinstance(res, VeredictoResponse)
    assert res.estado == "EN_LINEA"
    assert -8.0 <= res.desviacion_pct_barrio <= 8.0


def test_evaluar_inmueble_alquiler():
    # Evaluación en modo Alquiler
    res = evaluar_inmueble(precio=1500, metros=70, zona_str="Goya", operacion="Alquiler")
    assert isinstance(res, VeredictoResponse)
    assert res.precio_m2_inmueble > 0
    assert res.precio_m2_barrio_medio > 0


def test_evaluar_inmueble_valores_invalidos():
    with pytest.raises(ValueError):
        evaluar_inmueble(precio=-50000, metros=60, zona_str="Goya")

    with pytest.raises(ValueError):
        evaluar_inmueble(precio=200000, metros=0, zona_str="Goya")
