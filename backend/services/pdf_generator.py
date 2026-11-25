"""
backend/services/pdf_generator.py
Generador del Informe de Negociación Inmobiliaria de DMIYC en PDF (1 página A4) usando ReportLab.
"""
import io
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.charts.barcharts import VerticalBarChart

from backend.services.veredicto_engine import VeredictoResponse


def _fmt_es(val: float, decimals: int = 2, signed: bool = False) -> str:
    """Formatea un numero en es-ES: miles con punto y decimales con coma."""
    abs_val = abs(val)
    s = f"{abs_val:,.{decimals}f}"
    s = s.replace(",", "X").replace(".", ",").replace("X", ".")
    if signed:
        if val < 0:
            return f"−{s}"
        return f"+{s}"
    return f"−{s}" if val < 0 else s


def _fmt_pct_es(val: float) -> str:
    if val == 0:
        return "0,0 %"
    return f"{_fmt_es(val, 1, signed=True)} %"


def _crear_grafica_comparativa(veredicto: VeredictoResponse, is_alquiler: bool) -> Drawing:
    """Genera una grafica vectorial compacta de barras comparando inmueble, limite inferior, ref. ajustada, tope y Madrid."""
    drawing = Drawing(174 * mm, 38 * mm)
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
        c_user = colors.HexColor("#0284C7")
    elif "muy por encima" in v_str:
        c_user = colors.HexColor("#DC2626")
    else:
        c_user = colors.HexColor("#D97706")

    chart = VerticalBarChart()
    chart.x = 16 * mm
    chart.y = 7 * mm
    chart.height = 25 * mm
    chart.width = 150 * mm
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
    chart.categoryAxis.labels.fillColor = colors.HexColor("#334155")
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = y_max
    chart.valueAxis.labels.fontName = "Helvetica"
    chart.valueAxis.labels.fontSize = 7
    chart.valueAxis.labels.fillColor = colors.HexColor("#475569")
    chart.valueAxis.labelTextFormat = "%.1f" if is_alquiler else "%.0f"
    chart.bars[0].fillColor = colors.HexColor("#1E40AF")
    chart.bars[(0, 0)].fillColor = c_user
    chart.bars[(0, 1)].fillColor = colors.HexColor("#0284C7")
    chart.bars[(0, 2)].fillColor = colors.HexColor("#1E40AF")
    chart.bars[(0, 3)].fillColor = colors.HexColor("#475569")
    chart.bars[(0, 4)].fillColor = colors.HexColor("#94A3B8")
    chart.barLabels.nudge = 3
    chart.barLabelFormat = lambda v: _fmt_es(v, 2 if is_alquiler else 0)
    chart.barLabels.fontName = "Helvetica-Bold"
    chart.barLabels.fontSize = 6.8
    chart.barLabels.fillColor = colors.HexColor("#0F172A")

    drawing.add(chart)
    return drawing


def generar_dossier_pdf(veredicto: VeredictoResponse, precio_total: float, metros: float) -> bytes:
    """
    Genera el buffer de bytes del PDF del Informe de Negociacion DMIYC en 1 hoja A4.
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

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
        title="Informe de Negociacion - DMIYC",
        author="DMIYC"
    )

    styles = getSampleStyleSheet()
    c_primary = colors.HexColor("#0F172A")
    c_blue = colors.HexColor("#1E40AF")
    c_dark_gray = colors.HexColor("#334155")
    c_light_gray = colors.HexColor("#F8FAFC")
    c_border = colors.HexColor("#CBD5E1")

    v_str = (veredicto.veredicto or "").lower()
    if "debajo" in v_str:
        c_veredicto_bg = colors.HexColor("#DCFCE7")
        c_veredicto_text = colors.HexColor("#166534")
        veredicto_label = "POR DEBAJO DE LA REFERENCIA"
    elif "línea" in v_str or "linea" in v_str:
        c_veredicto_bg = colors.HexColor("#DBEAFE")
        c_veredicto_text = colors.HexColor("#1E40AF")
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

    style_header = ParagraphStyle("HeaderTitle", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=14, leading=16, textColor=c_primary)
    style_subtitle = ParagraphStyle("HeaderSubtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=11, textColor=c_dark_gray)
    style_section_title = ParagraphStyle("SectionTitle", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=c_primary, spaceBefore=4, spaceAfter=3)
    style_body = ParagraphStyle("BodyStyle", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=11, textColor=c_dark_gray)
    style_cell_right = ParagraphStyle("CellRight", parent=style_body, alignment=2)
    style_footnote = ParagraphStyle("FootnoteStyle", parent=styles["Normal"], fontName="Helvetica-Oblique", fontSize=7.5, leading=10, textColor=colors.HexColor("#475569"))
    style_disclaimer = ParagraphStyle("DisclaimerStyle", parent=styles["Normal"], fontName="Helvetica-Oblique", fontSize=7.2, leading=9.5, textColor=colors.HexColor("#64748B"))

    elements = []

    # 1. Cabecera DMIYC
    header_data = [
        [
            Paragraph("<b>DMIYC</b> · Informe de Negociación Inmobiliaria", style_header),
            Paragraph(f"<b>Fecha:</b> {datetime.now().strftime('%d/%m/%Y')} · <b>Ref:</b> DMIYC-{int(datetime.now().timestamp())}", style_subtitle)
        ],
        [
            Paragraph("Decide Madrid: Invierte y Compra · Datos Ayto. Madrid", style_subtitle),
            Paragraph(f"Modalidad: {getattr(veredicto, 'operacion', 'Venta')} · Datos de {periodo_txt}", style_subtitle)
        ]
    ]
    header_table = Table(header_data, colWidths=[106 * mm, 68 * mm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    elements.append(header_table)
    elements.append(HRFlowable(width="100%", thickness=1.2, color=c_blue, spaceBefore=3, spaceAfter=6))

    # 2. Resumen del Inmueble Analizado
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
    t_inmueble = Table(datos_inmueble, colWidths=[32 * mm, 58 * mm, 32 * mm, 52 * mm])
    t_inmueble.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), c_light_gray),
        ("BOX", (0, 0), (-1, -1), 0.5, c_border),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, c_border),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(t_inmueble)
    elements.append(Spacer(1, 5))

    # 3. Caja de Veredicto
    veredicto_box = [
        [Paragraph(f"<font size='10.5'><b>VEREDICTO: {veredicto_label}</b></font>", ParagraphStyle("VHead", parent=styles["Normal"], textColor=c_veredicto_text, alignment=1))],
        [Paragraph(
            f"{distancia_txt}<br/>"
            f"Para <b>{_fmt_es(metros, 0)} m²</b>, lo razonable estaría entre <b>{_fmt_es(veredicto.rango_total_bajo, 0)} y {_fmt_es(veredicto.rango_total_alto, 0)} {unidad_total}</b> "
            f"({fmt_m2(veredicto.rango_bajo)} – {fmt_m2(veredicto.rango_alto)} €/m²).",
            ParagraphStyle("VDesc", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=11.5, textColor=c_primary, alignment=1)
        )]
    ]
    t_veredicto = Table(veredicto_box, colWidths=[174 * mm])
    t_veredicto.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), c_veredicto_bg),
        ("BOX", (0, 0), (-1, -1), 0.9, c_veredicto_text),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(t_veredicto)
    elements.append(Spacer(1, 5))

    # 4. Tabla de Cálculo y Ajustes
    elements.append(Paragraph("1. Cálculo de la referencia y ajustes orientativos", style_section_title))
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
    t_comp = Table(comp_rows, colWidths=[60 * mm, 72 * mm, 42 * mm])
    t_comp.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), c_primary),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, c_light_gray]),
        ("BACKGROUND", (0, 5), (-1, 5), colors.HexColor("#EFF6FF")),
        ("BOX", (0, 0), (-1, -1), 0.5, c_border),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, c_border),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(t_comp)
    elements.append(Spacer(1, 2))
    elements.append(Paragraph("Ajustes orientativos, no medidos.", style_footnote))
    elements.append(Spacer(1, 4))

    # 5. Gráfica vectorial comparativa (con límite inferior y tope del rango)
    elements.append(Paragraph("2. Comparativa visual (€/m²)", style_section_title))
    elements.append(_crear_grafica_comparativa(veredicto, is_alquiler))
    elements.append(Spacer(1, 3))

    # 6. Fiabilidad y Aviso Legal al pie de la misma página
    fiabilidad = "media" if (is_alquiler and veredicto.confianza == "alta") else veredicto.confianza
    no_alq = ", no en alquileres" if is_alquiler else ""
    tx_txt = f"{_fmt_es(veredicto.num_transacciones, 0)} compraventas registradas en {veredicto.barrio_nombre} ({veredicto.anio_transacciones}){no_alq}" if veredicto.num_transacciones is not None else f"datos limitados en {veredicto.barrio_nombre}"
    elements.append(Paragraph(
        f"<b>Fiabilidad de la referencia:</b> {fiabilidad} · basada en {tx_txt}. "
        f"Datos de {periodo_txt}. No considera planta, orientación ni calidad concreta.",
        style_body
    ))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=c_border, spaceBefore=3, spaceAfter=3))
    elements.append(Paragraph(
        "<b>Aviso legal:</b> Documento gratuito generado por DMIYC (Decide Madrid: Invierte y Compra) a partir de series estadísticas del Ayuntamiento de Madrid. "
        "Tiene carácter puramente informativo y orientativo. No es una tasación ni una garantía de precio ni asesoramiento financiero o inmobiliario.",
        style_disclaimer
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
