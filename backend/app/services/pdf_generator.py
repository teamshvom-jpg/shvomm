import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from app.config.brand import BRAND_CONFIG


def generate_gift_request_pdf(request_data: dict) -> io.BytesIO:
    """
    Generates a quiet-luxury editorial PDF summary for a Shvom gift request.
    Returns a BytesIO buffer of the PDF file.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    story = []
    styles = getSampleStyleSheet()

    # Custom palette colors
    c_charcoal = colors.HexColor("#1A1A1A")
    c_gold = colors.HexColor("#B89B6A")
    c_stone = colors.HexColor("#8E8880")
    c_light_bg = colors.HexColor("#FAF8F5")
    c_border = colors.HexColor("#E5E0D8")

    # Typography styles
    brand_title_style = ParagraphStyle(
        "BrandTitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=24,
        leading=28,
        textColor=c_charcoal,
        alignment=0,
        spaceAfter=4
    )

    tagline_style = ParagraphStyle(
        "Tagline",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=9,
        leading=12,
        textColor=c_gold,
        spaceAfter=14
    )

    ref_style = ParagraphStyle(
        "RefText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=c_charcoal,
        alignment=2
    )

    h2_style = ParagraphStyle(
        "Heading2",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=16,
        textColor=c_charcoal,
        spaceBefore=14,
        spaceAfter=8
    )

    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=c_charcoal
    )

    label_style = ParagraphStyle(
        "Label",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=13,
        textColor=c_stone
    )

    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=c_stone,
        alignment=1
    )

    # 1. Header: Brand Wordmark + Reference Number
    ref_id = request_data.get("reference_id", "SHV-PROPOSAL")
    date_str = datetime.utcnow().strftime("%d %B %Y")
    
    header_data = [
        [
            Paragraph(f"<b>S H V O M</b>", brand_title_style),
            Paragraph(f"PROPOSAL REF: <b>{ref_id}</b><br/><font color='#8E8880'>{date_str}</font>", ref_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[320, 210])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Paragraph(BRAND_CONFIG["tagline"], tagline_style))
    story.append(HRFlowable(width="100%", thickness=0.8, color=c_border, spaceBefore=4, spaceAfter=14))

    # 2. Client & Commission Overview
    story.append(Paragraph("I. COMMISSION OVERVIEW", h2_style))
    client_info = [
        [
            Paragraph("Client / Patron", label_style),
            Paragraph(request_data.get("client_name", "N/A"), body_style),
            Paragraph("Occasion Type", label_style),
            Paragraph(request_data.get("occasion", "Bespoke").replace("_", " ").title(), body_style)
        ],
        [
            Paragraph("Email Address", label_style),
            Paragraph(request_data.get("client_email", "N/A"), body_style),
            Paragraph("Quantity Commissioned", label_style),
            Paragraph(f"{request_data.get('quantity', 'N/A')} units", body_style)
        ],
        [
            Paragraph("Telephone / WhatsApp", label_style),
            Paragraph(request_data.get("client_phone", "N/A"), body_style),
            Paragraph("Destination & Date", label_style),
            Paragraph(f"{request_data.get('delivery_city', 'N/A')} &bull; {request_data.get('delivery_date', 'N/A')}", body_style)
        ]
    ]
    client_table = Table(client_info, colWidths=[110, 155, 125, 140])
    client_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_light_bg),
        ('BOX', (0, 0), (-1, -1), 0.5, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(client_table)
    story.append(Spacer(1, 14))

    # 3. Bespoke Design Specifications
    story.append(Paragraph("II. CURATED DESIGN SPECIFICATIONS", h2_style))
    answers = request_data.get("answers", {})

    spec_rows = [
        [Paragraph("ELEMENT", label_style), Paragraph("SELECTION / CURATION", label_style)]
    ]

    # Map answers to formatted rows
    labels_map = {
        "gift_category": "Hero Sensory Medium",
        "packaging_style": "Vessel & Box Architecture",
        "personalization_level": "Artisanal Personalization",
        "corporate_tone": "Branding & Aesthetic Tone",
        "company_name": "Organization / Entity",
        "event_type": "Event / Milestone",
        "couple_names": "Couple Names",
        "wedding_aesthetic": "Wedding Atmosphere",
        "monogram_text": "Monogram Inscription",
        "desired_tone": "Brand Presence Tone",
        "special_notes": "Bespoke Requests"
    }

    for k, v in answers.items():
        if k in labels_map and v:
            display_val = str(v).replace("_", " ").title() if isinstance(v, str) else str(v)
            spec_rows.append([
                Paragraph(labels_map[k], label_style),
                Paragraph(display_val, body_style)
            ])

    if len(spec_rows) == 1:
        spec_rows.append([Paragraph("Curation", label_style), Paragraph("Studio Consultation Curation", body_style)])

    spec_table = Table(spec_rows, colWidths=[180, 350])
    spec_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_light_bg),
        ('BOX', (0, 0), (-1, -1), 0.5, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(spec_table)
    story.append(Spacer(1, 14))

    # 4. Investment Estimation
    story.append(Paragraph("III. INDICATIVE INVESTMENT ESTIMATE", h2_style))
    min_u = request_data.get("estimated_min_unit", 0)
    max_u = request_data.get("estimated_max_unit", 0)
    min_t = request_data.get("estimated_min_total", 0)
    max_t = request_data.get("estimated_max_total", 0)

    pricing_data = [
        [
            Paragraph("Indicative Unit Range", label_style),
            Paragraph(f"INR &#8377;{min_u:,.0f} &ndash; &#8377;{max_u:,.0f} per curated gift", body_style)
        ],
        [
            Paragraph("Total Commission Range", label_style),
            Paragraph(f"<b>INR &#8377;{min_t:,.0f} &ndash; &#8377;{max_t:,.0f}</b> (for {request_data.get('quantity', 50)} units)", body_style)
        ],
        [
            Paragraph("Terms & Inclusions", label_style),
            Paragraph("Includes custom packaging, personalization dies, QC white-glove inspection, and atelier assembly. Taxes and pan-India/international logistics calculated upon formal confirmation.", body_style)
        ]
    ]
    pricing_table = Table(pricing_data, colWidths=[180, 350])
    pricing_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), c_light_bg),
        ('BOX', (0, 0), (-1, -1), 0.5, c_border),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, c_border),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(pricing_table)
    story.append(Spacer(1, 20))

    # 5. Footer and Concierge Note
    story.append(HRFlowable(width="100%", thickness=0.5, color=c_border, spaceBefore=4, spaceAfter=8))
    footer_text = (
        f"<b>SHVOM BESPOKE GIFTING STUDIO</b> &bull; {BRAND_CONFIG['contact']['address']}<br/>"
        f"Concierge: {BRAND_CONFIG['contact']['email']} &bull; Phone / WhatsApp: {BRAND_CONFIG['contact']['phone']}<br/>"
        "Confidential document issued for client consideration. All bespoke designs remain proprietary."
    )
    story.append(Paragraph(footer_text, footer_style))

    doc.build(story)
    buffer.seek(0)
    return buffer
