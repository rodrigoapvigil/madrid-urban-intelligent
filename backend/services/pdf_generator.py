"""
backend/services/pdf_generator.py
Generador del Informe de Negociación Inmobiliaria de DMIYC en plantilla A4 vertical de 4 zonas (1 página).
"""
import io
import os
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle
)
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import VerticalBarChart

from backend.services.veredicto_engine import VeredictoResponse

_SERVICES_DIR = os.path.dirname(os.path.abspath(__file__))
_ROOT_DIR = os.path.normpath(os.path.join(_SERVICES_DIR, "..", ".."))
_LOGO_PATH = os.path.join(_ROOT_DIR, "frontend", "public", "dmiyc-logo-blue-rounded.png")

# Colores de plantilla
C_TEXT = colors.HexColor("#0A192F")
C_ACCENT = colors.HexColor("#0891B2")
C_METHOD_BG = colors.HexColor("#F1F5F9")
C_BORDER = colors.HexColor("#E2E8F0")
C_MUTED = colors.HexColor("#475569")
C_LIGHT_ROW = colors.HexColor("#F8FAFC")

# Textos fijos centralizados (única fuente)
TEMPLATE_TEXTS = {
    "brand": "DMIYC",
    "doc_title": "Informe de Negociación",
    "como_se_calcula_title": "Cómo se calcula",
    "como_se_calcula_body": (
        "Referencia = precio medio por m² del barrio en el último periodo con dato, "
        "ajustada de forma orientativa por estado, ascensor y tamaño. El rango razonable "
        "depende de la fiabilidad de los datos."
    ),
    "fuentes_title": "Fuentes",
    "fuentes_body": "Datos abiertos del Ayuntamiento de Madrid y de la Comunidad de Madrid. Último dato: {periodo}.",
    "aviso_title": "Aviso importante",
    "aviso_body": (
        "Este informe es una guía informativa y orientativa. No es una tasación, ni "
        "asesoramiento financiero, de inversión o inmobiliario, ni una garantía de precio. "
        "Contrasta siempre la información con un profesional antes de tomar decisiones."
    ),
    "footer_tpl": "DMIYC · Decide Madrid: Invierte y Compra · dmiyc.com · privacidad@dmiyc.com · Informe generado el {fecha} · Página 1 de 1",
}


def _fmt_es(val: float, decimals: int = 2, signed: bool = False) -> str:
    """Formatea un numero en es-ES: miles con punto y decimales con coma."""
    abs_val = abs(val)
    s = f"{abs_val:,.{decimals}f}"
    s = s.replace(",", "X").replace(".", ",").replace("X", ".")
    if signed:
        return f"−{s}" if val < 0 else f"+{s}"
    return f"−{s}" if val < 0 else s


def _fmt_pct_es(val: float) -> str:
    if val == 0:
        return "0,0 %"
    return f"{_fmt_es(val, 1, signed=True)} %"


def _crear_grafica_comparativa(veredicto: VeredictoResponse, is_alquiler: bool, height_mm: float = 34.0) -> Drawing:
    """Genera grafica vectorial compacta de barras comparando inmueble, limite inferior, ref. ajustada, tope y Madrid."""
    drawing = Drawing(180 * mm, height_mm * mm)
    vals = [
        round(veredicto.precio_m2_inmueble, 2),
        round(veredicto.rango_bajo, 2),
        round(veredicto.ref_ajustada, 2),
        round(veredicto.rango_alto, 2),
        round(veredicto.media_madrid, 2),
    ]
    max_val = max(vals) if vals else 100
    y_max = max_val * 1.25 if max_val > 0 else 100

    v_str = (veredicto.veredicto or "").lower()
    if "debajo" in v_str:
        c_user = colors.HexColor("#059669")
    elif "línea" in v_str or "linea" in v_str:
        c_user = C_ACCENT
    elif "muy por encima" in v_str:
        c_user = colors.HexColor("#DC2626")
    else:
        c_user = colors.HexColor("#D97706")

    chart = VerticalBarChart()
    chart.x = 16 * mm
    chart.y = 6 * mm
    chart.height = max(18.0, height_mm - 12.0) * mm
    chart.width = 154 * mm
    chart.data = [vals]
    chart.categoryAxis.categoryNames = [
        "Tu inmueble",
        "Lím. inferior",
        "Ref. ajustada",
        "Tope rango",
        "Media Madrid",
    ]
    chart.categoryAxis.labels.fontName = "Helvetica"
    chart.categoryAxis.labels.fontSize = 7.2
    chart.categoryAxis.labels.fillColor = C_TEXT
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = y_max
    chart.valueAxis.labels.fontName = "Helvetica"
    chart.valueAxis.labels.fontSize = 7
    chart.valueAxis.labels.fillColor = C_MUTED
    chart.valueAxis.labelTextFormat = "%.1f" if is_alquiler else "%.0f"
    chart.bars[0].fillColor = C_ACCENT
    chart.bars[(0, 0)].fillColor = c_user
    chart.bars[(0, 1)].fillColor = C_ACCENT
    chart.bars[(0, 2)].fillColor = C_TEXT
    chart.bars[(0, 3)].fillColor = C_MUTED
    chart.bars[(0, 4)].fillColor = colors.HexColor("#94A3B8")
    chart.barLabels.nudge = 3
    chart.barLabelFormat = lambda v: _fmt_es(v, 2 if is_alquiler else 0)
    chart.barLabels.fontName = "Helvetica-Bold"
    chart.barLabels.fontSize = 6.8
    chart.barLabels.fillColor = C_TEXT

    drawing.add(chart)
    return drawing


def generar_dossier_pdf(veredicto: VeredictoResponse, precio_total: float, metros: float) -> bytes:
    """
    Genera el PDF del Informe de Negociacion DMIYC en plantilla A4 vertical con 4 zonas fijas (1 pagina).
    """
    is_alquiler = getattr(veredicto, "operacion", "Venta").lower() == "alquiler"
    unidad_total = "€/mes" if is_alquiler else "€"
    dec_m2 = 2 if is_alquiler else 0
    fmt_m2 = lambda v: _fmt_es(v, dec_m2)

    meses_es = {
        "01": "enero", "02": "febrero", "03": "marzo", "04": "abril",
        "05": "mayo", "06": "junio", "07": "julio", "08": "agosto",
        "09": "septiembre", "10": "octubre", "11": "noviembre", "12": "diciembre"
    }
    p_parts = (veredicto.periodo_dato or "").split("-")
    periodo_txt = f"{meses_es.get(p_parts[1], p_parts[1])} {p_parts[0]}" if len(p_parts) == 2 else veredicto.periodo_dato

    fecha_hoy = datetime.now().strftime("%d/%m/%Y")
    ref_code = f"DMIYC-{int(datetime.now().timestamp())}"
    modalidad_txt = getattr(veredicto, "operacion", "Venta")

    styles = getSampleStyleSheet()
    style_body = ParagraphStyle("BodyStyle", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=11, textColor=C_TEXT)
    style_section_title = ParagraphStyle("SectionTitle", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10, leading=12.5, textColor=C_TEXT, spaceBefore=4, spaceAfter=3)
    style_cell_right = ParagraphStyle("CellRight", parent=style_body, alignment=2)
    style_footnote = ParagraphStyle("FootnoteStyle", parent=styles["Normal"], fontName="Helvetica-Oblique", fontSize=7.5, leading=10, textColor=C_MUTED)
    style_box_title = ParagraphStyle("BoxTitle", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=C_TEXT, spaceAfter=2)
    style_box_body = ParagraphStyle("BoxBody", parent=styles["Normal"], fontName="Helvetica", fontSize=7, leading=9.2, textColor=C_MUTED)

    # Dimensiones de pagina A4 (210 x 297 mm) con margenes laterales 15 mm
    page_w, page_h = A4
    margin_x = 15 * mm
    content_w = page_w - 2 * margin_x  # 180 mm

    header_h = 22 * mm
    top_pad = 6 * mm
    header_bottom_y = page_h - top_pad - header_h  # 269 mm

    footer_h = 14 * mm
    footer_top_y = footer_h  # 14 mm

    method_h = 38 * mm
    method_bottom_y = footer_top_y + 3 * mm  # 17 mm
    method_top_y = method_bottom_y + method_h  # 55 mm

    body_bottom_y = method_top_y + 4 * mm  # 59 mm
    body_top_y = header_bottom_y - 4 * mm  # 265 mm
    body_h = body_top_y - body_bottom_y  # 206 mm

    def _draw_fixed_zones(canvas, doc):
        canvas.saveState()
        # Fondo blanco
        canvas.setFillColor(colors.white)
        canvas.rect(0, 0, page_w, page_h, stroke=0, fill=1)

        # ZONA 1: CABECERA FIJA (22 mm)
        logo_size = 11 * mm
        logo_y = header_bottom_y + (header_h - logo_size) / 2.0 + 1 * mm
        if os.path.exists(_LOGO_PATH):
            canvas.drawImage(_LOGO_PATH, margin_x, logo_y, width=logo_size, height=logo_size, mask="auto")
            brand_x = margin_x + logo_size + 3 * mm
        else:
            brand_x = margin_x

        canvas.setFillColor(C_TEXT)
        canvas.setFont("Helvetica-Bold", 13)
        canvas.drawString(brand_x, header_bottom_y + 10.5 * mm, TEMPLATE_TEXTS["brand"])
        canvas.setFillColor(C_ACCENT)
        canvas.setFont("Helvetica-Bold", 12)
        canvas.drawCentredString(page_w / 2.0, header_bottom_y + 10.5 * mm, TEMPLATE_TEXTS["doc_title"])

        canvas.setFillColor(C_TEXT)
        canvas.setFont("Helvetica", 7.8)
        right_x = page_w - margin_x
        canvas.drawRightString(right_x, header_bottom_y + 14.5 * mm, f"Fecha: {fecha_hoy}")
        canvas.drawRightString(right_x, header_bottom_y + 10.0 * mm, f"Ref: {ref_code}")
        canvas.drawRightString(right_x, header_bottom_y + 5.5 * mm, f"Modalidad: {modalidad_txt}")

        # Linea fina #0891B2 debajo de la cabecera
        canvas.setStrokeColor(C_ACCENT)
        canvas.setLineWidth(1.0)
        canvas.line(margin_x, header_bottom_y, page_w - margin_x, header_bottom_y)

        # ZONA 3: BLOQUE DE METODO Y AVISO (38 mm, fondo #F1F5F9, borde #E2E8F0)
        col_w = content_w / 3.0
        method_table_data = [[
            [Paragraph(TEMPLATE_TEXTS["como_se_calcula_title"], style_box_title),
             Paragraph(TEMPLATE_TEXTS["como_se_calcula_body"], style_box_body)],
            [Paragraph(TEMPLATE_TEXTS["fuentes_title"], style_box_title),
             Paragraph(TEMPLATE_TEXTS["fuentes_body"].format(periodo=periodo_txt), style_box_body)],
            [Paragraph(TEMPLATE_TEXTS["aviso_title"], style_box_title),
             Paragraph(TEMPLATE_TEXTS["aviso_body"], style_box_body)],
        ]]
        t_method = Table(method_table_data, colWidths=[col_w, col_w, col_w], rowHeights=[method_h])
        t_method.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), C_METHOD_BG),
            ("BOX", (0, 0), (-1, -1), 0.75, C_BORDER),
            ("LINEAFTER", (0, 0), (1, 0), 0.5, C_BORDER),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ]))
        t_method.wrapOn(canvas, content_w, method_h)
        t_method.drawOn(canvas, margin_x, method_bottom_y)

        # ZONA 4: PIE FIJO (14 mm)
        canvas.setStrokeColor(C_BORDER)
        canvas.setLineWidth(0.6)
        canvas.line(margin_x, footer_top_y, page_w - margin_x, footer_top_y)
        canvas.setFillColor(C_MUTED)
        canvas.setFont("Helvetica", 7.2)
        canvas.drawCentredString(page_w / 2.0, footer_top_y - 6.5 * mm, TEMPLATE_TEXTS["footer_tpl"].format(fecha=fecha_hoy))

        canvas.restoreState()

    # ZONA 2: CUERPO FLEXIBLE
    v_str = (veredicto.veredicto or "").lower()
    if "debajo" in v_str:
        c_veredicto_bg = colors.HexColor("#DCFCE7")
        c_veredicto_text = colors.HexColor("#166534")
        veredicto_label = "POR DEBAJO DE LA REFERENCIA"
    elif "línea" in v_str or "linea" in v_str:
        c_veredicto_bg = colors.HexColor("#E0F2FE")
        c_veredicto_text = C_ACCENT
        veredicto_label = "EN LÍNEA CON LA ZONA"
    elif "muy por encima" in v_str:
        c_veredicto_bg = colors.HexColor("#FEE2E2")
        c_veredicto_text = colors.HexColor("#991B1B")
        veredicto_label = "MUY POR ENCIMA DE LA REFERENCIA"
    else:
        c_veredicto_bg = colors.HexColor("#FEF3C7")
        c_veredicto_text = colors.HexColor("#92400E")
        veredicto_label = "POR ENCIMA DE LA REFERENCIA"

    if veredicto.precio_m2_inmueble < veredicto.rango_bajo and veredicto.rango_bajo > 0:
        dist_pct = ((veredicto.rango_bajo - veredicto.precio_m2_inmueble) / veredicto.rango_bajo) * 100
        distancia_txt = f"Está un {_fmt_es(dist_pct, 1)} % por debajo del límite inferior del rango."
    elif veredicto.precio_m2_inmueble > veredicto.rango_alto and veredicto.rango_alto > 0:
        dist_pct = ((veredicto.precio_m2_inmueble - veredicto.rango_alto) / veredicto.rango_alto) * 100
        distancia_txt = f"Está un {_fmt_es(dist_pct, 1)} % por encima del límite superior del rango."
    else:
        distancia_txt = "Está dentro del rango razonable."

    def _build_body_elements(chart_h_mm: float):
        elems = []

        # Datos del inmueble (dentro del cuerpo, nunca en cabecera)
        zona_label = f"{veredicto.distrito_nombre} (Distrito)" if veredicto.barrio_nombre == veredicto.distrito_nombre else f"{veredicto.barrio_nombre} ({veredicto.distrito_nombre})"
        datos_inmueble = [
            [
                Paragraph("<b>Zona analizada:</b>", style_body),
                Paragraph(zona_label, style_body),
                Paragraph("<b>Precio analizado:</b>", style_body),
                Paragraph(f"<b>{_fmt_es(precio_total, 0)} {unidad_total}</b>", style_body)
            ],
            [
                Paragraph("<b>Superficie:</b>", style_body),
                Paragraph(f"{_fmt_es(metros, 0)} m² (media zona {_fmt_es(veredicto.superficie_media, 1)} m²)", style_body),
                Paragraph("<b>Precio por m²:</b>", style_body),
                Paragraph(f"<b>{fmt_m2(veredicto.precio_m2_inmueble)} €/m²</b>", style_body)
            ]
        ]
        t_inmueble = Table(datos_inmueble, colWidths=[32 * mm, 62 * mm, 32 * mm, 54 * mm])
        t_inmueble.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), C_LIGHT_ROW),
            ("BOX", (0, 0), (-1, -1), 0.5, C_BORDER),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, C_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elems.append(t_inmueble)
        elems.append(Spacer(1, 5))

        # Veredicto
        veredicto_box = [
            [Paragraph(f"<font size='10.5'><b>VEREDICTO: {veredicto_label}</b></font>", ParagraphStyle("VHead", parent=styles["Normal"], textColor=c_veredicto_text, alignment=1))],
            [Paragraph(
                f"{distancia_txt}<br/>"
                f"Para <b>{_fmt_es(metros, 0)} m²</b>, lo razonable estaría entre <b>{_fmt_es(veredicto.rango_total_bajo, 0)} y {_fmt_es(veredicto.rango_total_alto, 0)} {unidad_total}</b> "
                f"({fmt_m2(veredicto.rango_bajo)} – {fmt_m2(veredicto.rango_alto)} €/m²).",
                ParagraphStyle("VDesc", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=11.5, textColor=C_TEXT, alignment=1)
            )]
        ]
        t_veredicto = Table(veredicto_box, colWidths=[content_w])
        t_veredicto.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), c_veredicto_bg),
            ("BOX", (0, 0), (-1, -1), 0.9, c_veredicto_text),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elems.append(t_veredicto)
        elems.append(Spacer(1, 6))

        # Tabla de ajustes
        elems.append(Paragraph("1. Cálculo de la referencia y ajustes orientativos", style_section_title))
        aj = veredicto.ajustes or {}
        est_pct = aj.get("estado", {}).get("pct", 0.0)
        est_val = aj.get("estado", {}).get("valor", "no_indicado")
        est_txt = "a reformar" if est_val == "a_reformar" else "reformado" if est_val == "reformado" else "buen estado" if est_val == "buen_estado" else "no indicado"
        asc_pct = aj.get("ascensor", {}).get("pct", 0.0)
        asc_val = aj.get("ascensor", {}).get("valor", "no_indicado")
        asc_txt = "sí" if asc_val == "si" else "no" if asc_val == "no" else "no indicado"
        tam_pct = aj.get("tamano", {}).get("pct", 0.0)

        comp_rows = [
            [Paragraph("<b>Concepto</b>", ParagraphStyle("TH", parent=style_body, textColor=colors.white)),
             Paragraph("<b>Detalle</b>", ParagraphStyle("TH2", parent=style_body, textColor=colors.white)),
             Paragraph("<b>Valor</b>", ParagraphStyle("TH3", parent=style_body, textColor=colors.white, alignment=2))],
            [Paragraph(f"Referencia base ({veredicto.barrio_nombre})", style_body), Paragraph(f"Último cierre real ({periodo_txt})", style_body), Paragraph(f"{fmt_m2(veredicto.ref_base)} €/m²", style_cell_right)],
            [Paragraph(f"Ajuste por estado ({est_txt})", style_body), Paragraph("Calibración sobre referencia", style_body), Paragraph(_fmt_pct_es(est_pct), style_cell_right)],
            [Paragraph(f"Ajuste por ascensor ({asc_txt})", style_body), Paragraph("Calibración sobre referencia", style_body), Paragraph(_fmt_pct_es(asc_pct), style_cell_right)],
            [Paragraph("Ajuste por tamaño", style_body), Paragraph(f"Media zona: {_fmt_es(veredicto.superficie_media, 1)} m²", style_body), Paragraph(_fmt_pct_es(tam_pct), style_cell_right)],
            [Paragraph("<b>Referencia ajustada</b>", style_body), Paragraph("Base calibrada orientativa", style_body), Paragraph(f"<b>{fmt_m2(veredicto.ref_ajustada)} €/m²</b>", style_cell_right)],
            [Paragraph("<b>Rango razonable</b>", style_body), Paragraph(f"Para {_fmt_es(metros, 0)} m²: {_fmt_es(veredicto.rango_total_bajo, 0)} – {_fmt_es(veredicto.rango_total_alto, 0)} {unidad_total}", style_body), Paragraph(f"<b>{fmt_m2(veredicto.rango_bajo)} – {fmt_m2(veredicto.rango_alto)} €/m²</b>", style_cell_right)],
            [Paragraph("Media Madrid Capital", style_body), Paragraph("Referencia metropolitana", style_body), Paragraph(f"{fmt_m2(veredicto.media_madrid)} €/m²", style_cell_right)],
        ]
        t_comp = Table(comp_rows, colWidths=[62 * mm, 76 * mm, 42 * mm])
        t_comp.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), C_TEXT),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, C_LIGHT_ROW]),
            ("BACKGROUND", (0, 5), (-1, 5), colors.HexColor("#ECFEFF")),
            ("BOX", (0, 0), (-1, -1), 0.5, C_BORDER),
            ("INNERGRID", (0, 0), (-1, -1), 0.4, C_BORDER),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        elems.append(t_comp)
        elems.append(Spacer(1, 2))
        elems.append(Paragraph("Ajustes orientativos, no medidos.", style_footnote))
        elems.append(Spacer(1, 5))

        # Gráfica
        elems.append(Paragraph("2. Comparativa visual (€/m²)", style_section_title))
        elems.append(_crear_grafica_comparativa(veredicto, is_alquiler, height_mm=chart_h_mm))
        elems.append(Spacer(1, 4))

        # Fiabilidad
        fiabilidad = "media" if (is_alquiler and veredicto.confianza == "alta") else veredicto.confianza
        no_alq = ", no en alquileres" if is_alquiler else ""
        tx_txt = f"{_fmt_es(veredicto.num_transacciones, 0)} compraventas registradas en {veredicto.barrio_nombre} ({veredicto.anio_transacciones}){no_alq}" if veredicto.num_transacciones is not None else f"datos limitados en {veredicto.barrio_nombre}"
        elems.append(Paragraph(
            f"<b>Fiabilidad de la referencia:</b> {fiabilidad} · basada en {tx_txt}. "
            f"Datos de {periodo_txt}. No considera planta, orientación ni calidad concreta.",
            style_body
        ))
        return elems

    # Garantizar estrictamente 1 pagina: si el cuerpo excede body_h, reducir altura de grafica
    for chart_h in (38.0, 32.0, 26.0):
        buffer = io.BytesIO()
        body_frame = Frame(
            margin_x,
            body_bottom_y,
            content_w,
            body_h,
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
            id="body_frame"
        )
        doc = BaseDocTemplate(
            buffer,
            pagesize=A4,
            title=f"{TEMPLATE_TEXTS['doc_title']} - {TEMPLATE_TEXTS['brand']}",
            author=TEMPLATE_TEXTS["brand"],
            pageTemplates=[PageTemplate(id="main", frames=[body_frame], onPage=_draw_fixed_zones)]
        )
        doc.build(_build_body_elements(chart_h))
        if doc.page <= 1:
            buffer.seek(0)
            return buffer.getvalue()

    buffer.seek(0)
    return buffer.getvalue()
