"""
backend/tests/test_portal_parser.py
Pruebas unitarias para el extractor hibrido de portales inmobiliarios
"""
import pytest
from backend.services.portal_parser import (
    extraer_precio,
    extraer_metros,
    detectar_operacion,
    parse_html_content,
    PortalParsedData
)


def test_extraer_precio():
    assert extraer_precio("Piso en venta en Goya, 450.000 €") == 450000.0
    assert extraer_precio("Ático de lujo en Recoletos - 1.250.000 euros") == 1250000.0
    assert extraer_precio("Alquiler mensual: 1.800 €/mes") == 1800.0
    assert extraer_precio("Sin precio especificado") is None


def test_extraer_metros():
    assert extraer_metros("Magnífico piso de 95 m² con terraza") == 95.0
    assert extraer_metros("Estudio de 45m2 reformado") == 45.0
    assert extraer_metros("Chalet de 320 metros cuadrados") == 320.0
    assert extraer_metros("No indica superficie") is None


def test_detectar_operacion():
    assert detectar_operacion("Piso en venta en Chamberí") == "Venta"
    assert detectar_operacion("Piso en alquiler en Malasaña") == "Alquiler"
    assert detectar_operacion("Estudio en Madrid", url="https://www.idealista.com/alquiler-viviendas/madrid/") == "Alquiler"


def test_parse_html_content_opengraph():
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta property="og:title" content="Piso en venta en calle Claudio Coello, Goya, Madrid — 580.000 €" />
        <meta property="og:description" content="Piso de 82 m², 2 habitaciones, exterior con ascensor en el barrio de Goya." />
    </head>
    <body></body>
    </html>
    """
    res = parse_html_content(html, url="https://www.idealista.com/inmueble/12345/")
    assert isinstance(res, PortalParsedData)
    assert res.precio == 580000.0
    assert res.metros == 82.0
    assert res.barrio == "Goya"
    assert res.operacion == "Venta"
    assert res.requiere_manual is False


def test_parse_html_content_incompleto_activa_fallback():
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta property="og:title" content="Inmueble exclusivo en Madrid" />
    </head>
    <body></body>
    </html>
    """
    res = parse_html_content(html)
    assert isinstance(res, PortalParsedData)
    assert res.requiere_manual is True
    assert res.error_mensaje is not None
