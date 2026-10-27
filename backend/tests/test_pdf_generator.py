"""
backend/tests/test_pdf_generator.py
Pruebas para el generador de dossiers PDF con ReportLab
"""
import pytest
from backend.services.veredicto_engine import evaluar_inmueble
from backend.services.pdf_generator import generar_dossier_pdf


def test_generar_dossier_pdf_caro():
    veredicto = evaluar_inmueble(precio=1200000, metros=80, zona_str="Goya", operacion="Venta")
    pdf_bytes = generar_dossier_pdf(veredicto, precio_total=1200000, metros=80)
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 2000


def test_generar_dossier_pdf_barato():
    veredicto = evaluar_inmueble(precio=350000, metros=80, zona_str="Goya", operacion="Venta")
    pdf_bytes = generar_dossier_pdf(veredicto, precio_total=350000, metros=80)
    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 2000
