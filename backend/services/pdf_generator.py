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

from backend.services.veredicto_engine import VeredictoResponse


def generar_dossier_pdf(veredicto: VeredictoResponse, precio_total: float, metros: float) -> bytes:
    """
    Genera el buffer de bytes del PDF del Dossier Oficial de Negociación.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="Dossier Oficial de Negociacion - Madrid Urban Intelligence",
        author="Madrid Urban Intelligence"
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
        veredicto_label = "SOBREPRECIO DETECTADO (CARO)"
    elif veredicto.estado == "BARATO":
        c_veredicto_bg = colors.HexColor("#DCFCE7")
        c_veredicto_text = colors.HexColor("#166534")
        veredicto_label = "OPORTUNIDAD DE PRECIO (BARATO)"
    else:
        c_veredicto_bg = colors.HexColor("#DBEAFE")
        c_veredicto_text = colors.HexColor("#1E40AF")
        veredicto_label = "EN PRECIO DE MERCADO (EN LÍNEA)"

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
            Paragraph("<b>MADRID URBAN INTELLIGENCE</b>", style_header),
            Paragraph(f"<b>Fecha:</b> {datetime.now().strftime('%d/%m/%Y')}<br/><b>Referencia:</b> MUI-{int(datetime.now().timestamp())}", style_subtitle)
        ],
        [
            Paragraph("Dossier Oficial de Negociación y Valoración Inmobiliaria", style_subtitle),
            Paragraph("Datos de Cierre: Ayuntamiento de Madrid", style_subtitle)
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
            Paragraph(f"<b>{precio_total:,.0f} €</b>", style_body)
        ],
        [
            Paragraph("<b>Superficie:</b>", style_body),
            Paragraph(f"{metros:,.0f} m² construidos", style_body),
            Paragraph("<b>Ratio resultante:</b>", style_body),
            Paragraph(f"<b>{veredicto.precio_m2_inmueble:,.0f} €/m²</b>", style_body)
        ]
    ]
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
                f"El precio del inmueble ({veredicto.precio_m2_inmueble:,.0f} €/m²) presenta una desviación del <b>{desv_sign}{veredicto.desviacion_pct_barrio:.1f}%</b> respecto al precio medio de cierre del barrio de {veredicto.barrio_nombre} ({veredicto.precio_m2_barrio_medio:,.0f} €/m²).<br/>"
                f"<b>Margen estimado de negociación sugerido:</b> {veredicto.margen_negociacion_estimado_eur:,.0f} €",
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
    elements.append(Paragraph("1. Contraste frente a Series Históricas Oficiales", style_section_title))
    comp_header = ["Ámbito territorial", "Precio medio oficial", "Desviación vs Inmueble", "Estado comparativo"]
    comp_rows = [
        [
            f"Barrio ({veredicto.barrio_nombre})",
            f"{veredicto.precio_m2_barrio_medio:,.0f} €/m²",
            f"{desv_sign}{veredicto.desviacion_pct_barrio:.1f}%",
            veredicto.estado
        ],
        [
            f"Distrito ({veredicto.distrito_nombre})",
            f"{veredicto.precio_m2_distrito_medio:,.0f} €/m²",
            f"{((veredicto.precio_m2_inmueble - veredicto.precio_m2_distrito_medio) / veredicto.precio_m2_distrito_medio * 100):+.1f}%",
            "Referencia zonal"
        ],
        [
            "Media Madrid Capital",
            f"{veredicto.precio_m2_madrid_medio:,.0f} €/m²",
            f"{veredicto.desviacion_pct_madrid:+.1f}%",
            "Referencia metropolitana"
        ],
        [
            "Precio Justo de Mercado Estimado",
            f"{veredicto.precio_justo_estimado_eur:,.0f} €",
            f"-{veredicto.margen_negociacion_estimado_eur:,.0f} €",
            "Objetivo de negociación"
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
    elements.append(Spacer(1, 12))

    # 5. Argumentario Táctico para Negociación
    elements.append(Paragraph("2. Argumentario Defendible para la Negociación", style_section_title))
    arg_rows = []
    for idx, arg in enumerate(veredicto.resumen_argumentos, start=1):
        arg_rows.append([
            Paragraph(f"<b>Punto {idx}:</b>", style_body),
            Paragraph(arg, style_arg)
        ])

    # Argumento complementario bancario / tasador
    arg_rows.append([
        Paragraph("<b>Punto técnico:</b>", style_body),
        Paragraph(
            "Al presentar este informe ante el vendedor o agencia, señale que las tasaciones hipotecarias bancarias "
            f"se ajustan a las operaciones efectivas registradas en la zona ({veredicto.precio_m2_barrio_medio:,.0f} €/m²). "
            f"Un sobreprecio superior al 8% eleva el riesgo de desfase en la concesión del préstamo hipotecario.",
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
        "<b>Aviso legal y marco metodológico:</b> Este documento ha sido generado por el motor analítico de Madrid Urban Intelligence "
        "a partir de las series estadísticas de transacciones y datos de cierre publicados por el Ayuntamiento de Madrid (registro de operaciones y "
        f"actualizaciones hasta {veredicto.fecha_cierre_referencia}). Las estimaciones de precios y márgenes de negociación tienen carácter puramente "
        "informativo y orientativo. No constituyen una tasación pericial oficial conforme a la Orden ECO/805/2003 ni asesoramiento financiero, "
        "legal o tributario vinculante. Madrid Urban Intelligence declina toda responsabilidad derivada del uso de este documento en acuerdos comerciales entre particulares."
    )
    elements.append(Paragraph(disclaimer_text, style_disclaimer))

    # Construir PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
