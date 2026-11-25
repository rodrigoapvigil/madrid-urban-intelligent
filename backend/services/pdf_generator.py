"""
backend/services/pdf_generator.py
Generador del Dossier Oficial de Negociación Inmobiliaria en PDF utilizando ReportLab.
Produce un documento estructurado de alta fidelidad para presentar al vendedor o entidad bancaria.
"""
import io
from datetime import datetime
from typing import Dict, Any, List

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.graphics.shapes import Drawing, String
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.widgets.markers import makeMarker

from backend.services.veredicto_engine import VeredictoResponse


def _crear_grafica_comparativa(veredicto: VeredictoResponse, is_alquiler: bool) -> Drawing:
    """Genera una grafica vectorial de barras comparando el inmueble vs barrio, distrito y Madrid."""
    drawing = Drawing(174 * mm, 52 * mm)
    vals = [
        round(veredicto.precio_m2_inmueble, 2),
        round(veredicto.precio_m2_barrio_medio, 2),
        round(veredicto.precio_m2_distrito_medio, 2),
        round(veredicto.precio_m2_madrid_medio, 2),
    ]
    max_val = max(vals) if vals else 100
    y_max = max_val * 1.25 if max_val > 0 else 100

    chart = VerticalBarChart()
    chart.x = 18 * mm
    chart.y = 10 * mm
    chart.height = 34 * mm
    chart.width = 148 * mm
    chart.data = [vals]
    chart.categoryAxis.categoryNames = [
        "Inmueble",
        f"Barrio\n({veredicto.barrio_nombre[:14]})",
        f"Distrito\n({veredicto.distrito_nombre[:14]})",
        "Media Madrid",
    ]
    chart.categoryAxis.labels.fontName = "Helvetica"
    chart.categoryAxis.labels.fontSize = 7.5
    chart.categoryAxis.labels.fillColor = colors.HexColor("#334155")
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = y_max
    chart.valueAxis.labels.fontName = "Helvetica"
    chart.valueAxis.labels.fontSize = 7.5
    chart.valueAxis.labels.fillColor = colors.HexColor("#475569")
    chart.valueAxis.labelTextFormat = "%.1f €/m²" if is_alquiler else "%.0f €/m²"
    chart.bars[0].fillColor = colors.HexColor("#1E40AF")
    chart.bars[(0, 0)].fillColor = (
        colors.HexColor("#DC2626") if veredicto.estado == "CARO"
        else colors.HexColor("#16A34A") if veredicto.estado == "BARATO"
        else colors.HexColor("#0284C7")
    )
    chart.bars[(0, 1)].fillColor = colors.HexColor("#1E40AF")
    chart.bars[(0, 2)].fillColor = colors.HexColor("#475569")
    chart.bars[(0, 3)].fillColor = colors.HexColor("#94A3B8")
    chart.barLabels.nudge = 4
    chart.barLabelFormat = "%.2f" if is_alquiler else "%.0f"
    chart.barLabels.fontName = "Helvetica-Bold"
    chart.barLabels.fontSize = 7.5
    chart.barLabels.fillColor = colors.HexColor("#0F172A")

    drawing.add(chart)
    return drawing


def generar_dossier_pdf(veredicto: VeredictoResponse, precio_total: float, metros: float) -> bytes:
    """
    Genera el buffer de bytes del PDF del Informe de Negociacion DMIYC.
    """
    is_alquiler = getattr(veredicto, "operacion", "Venta").lower() == "alquiler"
    unidad_total = "€/mes" if is_alquiler else "€"
    fmt_m2 = lambda v: f"{v:,.2f}" if is_alquiler else f"{v:,.0f}"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="Informe de Negociacion - DMIYC",
        author="DMIYC"
    )

    styles = getSampleStyleSheet()

    # Colores institucionales
    c_primary = colors.HexColor("#0F172A")    # Pizarra oscura
    c_blue = colors.HexColor("#1E40AF")       # Azul corporativo
    c_dark_gray = colors.HexColor("#334155")
    c_light_gray = colors.HexColor("#F8FAFC")
    c_border = colors.HexColor("#E2E8F0")

    # Colores segun veredicto
    if veredicto.estado == "CARO":
        c_veredicto_bg = colors.HexColor("#FEE2E2")
        c_veredicto_text = colors.HexColor("#991B1B")
        veredicto_label = "POR ENCIMA DE LA REFERENCIA"
    elif veredicto.estado == "BARATO":
        c_veredicto_bg = colors.HexColor("#DCFCE7")
        c_veredicto_text = colors.HexColor("#166534")
        veredicto_label = "POR DEBAJO DE LA REFERENCIA"
    else:
        c_veredicto_bg = colors.HexColor("#DBEAFE")
        c_veredicto_text = colors.HexColor("#1E40AF")
        veredicto_label = "EN EL RANGO DE REFERENCIA"
    estado_comparativo = veredicto_label

    # Estilos tipograficos
    style_header = ParagraphStyle(
        "HeaderTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=c_primary
    )
    style_subtitle = ParagraphStyle(
        "HeaderSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=c_dark_gray
    )
    style_section_title = ParagraphStyle(
        "SectionTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=c_primary,
        spaceBefore=10,
        spaceAfter=6
    )
    style_body = ParagraphStyle(
        "BodyStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=c_dark_gray
    )
    style_arg = ParagraphStyle(
        "ArgStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=c_primary
    )
    style_disclaimer = ParagraphStyle(
        "DisclaimerStyle",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#64748B")
    )

    elements = []

    # 1. Cabecera Institucional
    header_data = [
        [
            Paragraph("<b>DMIYC</b>", style_header),
            Paragraph(f"<b>Fecha:</b> {datetime.now().strftime('%d/%m/%Y')}<br/><b>Referencia:</b> DMIYC-{int(datetime.now().timestamp())}", style_subtitle)
        ],
        [
            Paragraph("Decide Madrid: Invierte y Compra · Informe de Negociación", style_subtitle),
            Paragraph(f"Modalidad: {getattr(veredicto, 'operacion', 'Venta')} · Datos Ayto. Madrid", style_subtitle)
        ]
    ]
    header_table = Table(header_data, colWidths=[110 * mm, 64 * mm])
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    elements.append(header_table)
    elements.append(HRFlowable(width="100%", thickness=1.5, color=c_blue, spaceBefore=4, spaceAfter=10))

    # 2. Resumen del Inmueble Analizado
    datos_inmueble = [
        [
            Paragraph("<b>Inmueble evaluado:</b>", style_body),
            Paragraph(f"{veredicto.barrio_nombre} (Distrito {veredicto.distrito_nombre})", style_body),
            Paragraph("<b>Precio analizado:</b>", style_body),
            Paragraph(f"<b>{precio_total:,.0f} {unidad_total}</b>", style_body)
        ],
        [
            Paragraph("<b>Superficie:</b>", style_body),
            Paragraph(f"{metros:,.0f} m² construidos", style_body),
            Paragraph("<b>Ratio resultante:</b>", style_body),
            Paragraph(f"<b>{fmt_m2(veredicto.precio_m2_inmueble)} €/m²</b>", style_body)
        ]
    ]
    estado_inm = getattr(veredicto, "estado_inmueble", None)
    ascensor_inm = getattr(veredicto, "ascensor", None)
    if estado_inm or ascensor_inm is not None:
        datos_inmueble.append([
            Paragraph("<b>Estado:</b>", style_body),
            Paragraph(estado_inm or "No especificado", style_body),
            Paragraph("<b>Ascensor:</b>", style_body),
            Paragraph("Sí" if ascensor_inm is True else "No" if ascensor_inm is False else "No especificado", style_body)
        ])
    t_inmueble = Table(datos_inmueble, colWidths=[38 * mm, 50 * mm, 38 * mm, 48 * mm])
    t_inmueble.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), c_light_gray),
        ("BOX", (0, 0), (-1, -1), 0.5, c_border),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, c_border),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(t_inmueble)
    elements.append(Spacer(1, 10))

    # 3. Caja de Veredicto Visual
    desv_sign = "+" if veredicto.desviacion_pct_barrio > 0 else ""
    veredicto_box = [
        [
            Paragraph(f"<font size='12'><b>VEREDICTO: {veredicto_label}</b></font>", ParagraphStyle("VHead", parent=styles["Normal"], textColor=c_veredicto_text, alignment=1)),
        ],
        [
            Paragraph(
                f"El precio indicado ({fmt_m2(veredicto.precio_m2_inmueble)} €/m²) está <b>{abs(veredicto.desviacion_pct_barrio):.1f}% {'por encima de' if veredicto.desviacion_pct_barrio > 0 else 'por debajo de' if veredicto.desviacion_pct_barrio < 0 else 'en torno a'} la referencia estimada</b> de {veredicto.barrio_nombre} ({fmt_m2(veredicto.precio_m2_barrio_medio)} €/m²).<br/>"
                f"<b>Referencia para la superficie indicada:</b> {veredicto.precio_justo_estimado_eur:,.0f} {unidad_total}",
                ParagraphStyle("VDesc", parent=styles["Normal"], fontName="Helvetica", fontSize=9, leading=13, textColor=c_primary, alignment=1)
            )
        ]
    ]
    t_veredicto = Table(veredicto_box, colWidths=[174 * mm])
    t_veredicto.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), c_veredicto_bg),
        ("BOX", (0, 0), (-1, -1), 1, c_veredicto_text),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
    ]))
    elements.append(t_veredicto)
    elements.append(Spacer(1, 12))

    # 4. Tabla Comparativa frente a Medias Oficiales de Madrid
    elements.append(Paragraph("1. Comparación con referencias estadísticas", style_section_title))
    comp_header = ["Ámbito territorial", "Referencia observada", "Diferencia", "Comparación"]
    comp_rows = [
        [
            f"Barrio ({veredicto.barrio_nombre})",
            f"{fmt_m2(veredicto.precio_m2_barrio_medio)} €/m²",
            f"{desv_sign}{veredicto.desviacion_pct_barrio:.1f}%",
            estado_comparativo
        ],
        [
            f"Distrito ({veredicto.distrito_nombre})",
            f"{fmt_m2(veredicto.precio_m2_distrito_medio)} €/m²",
            f"{((veredicto.precio_m2_inmueble - veredicto.precio_m2_distrito_medio) / veredicto.precio_m2_distrito_medio * 100):+.1f}%",
            "Referencia zonal"
        ],
        [
            "Media Madrid Capital",
            f"{fmt_m2(veredicto.precio_m2_madrid_medio)} €/m²",
            f"{veredicto.desviacion_pct_madrid:+.1f}%",
            "Referencia metropolitana"
        ],
        [
            "Referencia estimada para la superficie",
            f"{veredicto.precio_justo_estimado_eur:,.0f} {unidad_total}",
            f"-{veredicto.margen_negociacion_estimado_eur:,.0f} {unidad_total}",
            "Cálculo basado en la media de la zona"
        ]
    ]
    t_comp = Table([comp_header] + comp_rows, colWidths=[55 * mm, 38 * mm, 43 * mm, 38 * mm])
    t_comp.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), c_primary),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 8.5),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, c_light_gray]),
        ("BOX", (0, 0), (-1, -1), 0.5, c_border),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, c_border),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(t_comp)
    elements.append(Spacer(1, 10))

    # Gráfica vectorial comparativa
    elements.append(Paragraph("2. Gráfica comparativa (€/m²)", style_section_title))
    elements.append(_crear_grafica_comparativa(veredicto, is_alquiler))
    elements.append(Spacer(1, 10))

    # 5. Lectura de la comparación
    elements.append(Paragraph("3. Argumentos estructurados para la negociación", style_section_title))
    arg_rows = []
    for idx, arg in enumerate(veredicto.resumen_argumentos, start=1):
        arg_rows.append([
            Paragraph(f"<b>Punto {idx}:</b>", style_body),
            Paragraph(arg, style_arg)
        ])

    # Contexto informativo adicional
    arg_rows.append([
        Paragraph("<b>Contexto:</b>", style_body),
        Paragraph(
            f"Esta referencia se calcula a partir de operaciones de cierre observadas en la zona ({fmt_m2(veredicto.precio_m2_barrio_medio)} €/m²). Es estadística e informativa: no es una tasación ni asesoramiento financiero o inmobiliario.",
            style_arg
        )
    ])

    t_args = Table(arg_rows, colWidths=[25 * mm, 149 * mm])
    t_args.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 3),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, c_border),
    ]))
    elements.append(t_args)
    elements.append(Spacer(1, 15))

    # 6. Cláusula Legal y Disclaimer
    elements.append(HRFlowable(width="100%", thickness=0.5, color=c_border, spaceBefore=4, spaceAfter=8))
    disclaimer_text = (
        "<b>Aviso legal y marco metodológico:</b> Este documento ha sido generado gratuitamente por DMIYC (Decide Madrid: Invierte y Compra) "
        "a partir de las series estadísticas de transacciones y datos de cierre publicados por el Ayuntamiento de Madrid (registro de operaciones y "
        f"actualizaciones hasta {veredicto.fecha_cierre_referencia}). Las referencias de precios tienen carácter puramente "
        "informativo y orientativo. No constituyen una tasación ni asesoramiento financiero, de inversión o inmobiliario, "
        "legal o tributario vinculante. DMIYC declina toda responsabilidad derivada del uso de este documento en acuerdos comerciales entre particulares."
    )
    elements.append(Paragraph(disclaimer_text, style_disclaimer))

    # Construir PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
