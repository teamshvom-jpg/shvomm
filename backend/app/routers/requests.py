import os
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.request import GiftRequest
from app.schemas.request import GiftRequestCreate, GiftRequestResponse
from app.services.estimator import calculate_estimate
from app.services.mailer import notify_team_new_request, send_client_confirmation
from app.services.pdf_generator import generate_gift_request_pdf

router = APIRouter(prefix="/api/requests", tags=["requests"])


def generate_reference_id(db: Session) -> str:
    current_year = datetime.utcnow().year
    prefix = f"SHV-{current_year}-"
    # Find last sequence for current year
    last_req = (
        db.query(GiftRequest)
        .filter(GiftRequest.reference_id.like(f"{prefix}%"))
        .order_by(GiftRequest.id.desc())
        .first()
    )
    if not last_req:
        seq = 1
    else:
        try:
            seq = int(last_req.reference_id.split("-")[-1]) + 1
        except Exception:
            seq = db.query(GiftRequest).count() + 1
    return f"{prefix}{seq:04d}"


@router.post("", response_model=GiftRequestResponse, status_code=201)
def create_gift_request(
    payload: GiftRequestCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Submits a new bespoke gift commission request.
    Computes rule-based estimate, stores record, sends alerts, and returns reference code.
    """
    category = payload.answers.get("gift_category", "bespoke_curation")
    packaging = payload.answers.get("packaging_style", "linen_keepsake_box")
    personalization = payload.answers.get("personalization_level", "custom_card")

    est = calculate_estimate(
        category_key=category,
        packaging_key=packaging,
        personalization_key=personalization,
        quantity=payload.quantity,
        budget_per_gift=payload.budget_per_gift
    )

    ref_id = generate_reference_id(db)

    db_item = GiftRequest(
        reference_id=ref_id,
        occasion=payload.occasion,
        client_name=payload.client_name,
        client_email=payload.client_email,
        client_phone=payload.client_phone,
        delivery_city=payload.delivery_city,
        delivery_date=payload.delivery_date,
        quantity=payload.quantity,
        budget_per_gift=payload.budget_per_gift or 3500.0,
        estimated_min_unit=est["min_unit"],
        estimated_max_unit=est["max_unit"],
        estimated_min_total=est["min_total"],
        estimated_max_total=est["max_total"],
        status="New",
        answers_json=json.dumps(payload.answers),
        logo_url=payload.logo_url,
        reference_image_url=payload.reference_image_url,
        special_notes=payload.special_notes,
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    req_dict = {
        "reference_id": db_item.reference_id,
        "client_name": db_item.client_name,
        "client_email": db_item.client_email,
        "client_phone": db_item.client_phone,
        "occasion": db_item.occasion,
        "quantity": db_item.quantity,
        "delivery_city": db_item.delivery_city,
        "delivery_date": db_item.delivery_date,
        "budget_per_gift": db_item.budget_per_gift,
        "estimated_min_unit": db_item.estimated_min_unit,
        "estimated_max_unit": db_item.estimated_max_unit,
        "estimated_min_total": db_item.estimated_min_total,
        "estimated_max_total": db_item.estimated_max_total,
        "answers": payload.answers,
        "special_notes": db_item.special_notes,
        "logo_url": db_item.logo_url,
        "reference_image_url": db_item.reference_image_url
    }

    # Dispatch emails: on serverless (Vercel) execute directly to avoid container freeze
    if os.environ.get("VERCEL") or os.environ.get("SYNC_MAILS"):
        try:
            notify_team_new_request(req_dict)
            send_client_confirmation(req_dict)
        except Exception:
            pass
    else:
        background_tasks.add_task(notify_team_new_request, req_dict)
        background_tasks.add_task(send_client_confirmation, req_dict)

    return GiftRequestResponse(
        id=db_item.id,
        reference_id=db_item.reference_id,
        occasion=db_item.occasion,
        client_name=db_item.client_name,
        client_email=db_item.client_email,
        client_phone=db_item.client_phone,
        delivery_city=db_item.delivery_city,
        delivery_date=db_item.delivery_date,
        quantity=db_item.quantity,
        budget_per_gift=db_item.budget_per_gift,
        estimated_min_unit=db_item.estimated_min_unit,
        estimated_max_unit=db_item.estimated_max_unit,
        estimated_min_total=db_item.estimated_min_total,
        estimated_max_total=db_item.estimated_max_total,
        status=db_item.status,
        answers=json.loads(db_item.answers_json),
        logo_url=db_item.logo_url,
        reference_image_url=db_item.reference_image_url,
        special_notes=db_item.special_notes,
        admin_notes=db_item.admin_notes,
        created_at=db_item.created_at,
        updated_at=db_item.updated_at
    )


@router.get("/{identifier}/pdf")
def download_request_pdf(identifier: str, db: Session = Depends(get_db)):
    """
    Downloads or previews the formal Shvom-branded PDF summary for a request.
    Identifier can be either integer ID or reference_id string (e.g. SHV-2026-0001).
    """
    if identifier.isdigit():
        req = db.query(GiftRequest).filter(GiftRequest.id == int(identifier)).first()
    else:
        req = db.query(GiftRequest).filter(GiftRequest.reference_id == identifier).first()

    if not req:
        raise HTTPException(status_code=404, detail="Commission request not found")

    try:
        answers = json.loads(req.answers_json) if req.answers_json else {}
    except Exception:
        answers = {}

    req_data = {
        "reference_id": req.reference_id,
        "client_name": req.client_name,
        "client_email": req.client_email,
        "client_phone": req.client_phone,
        "occasion": req.occasion,
        "quantity": req.quantity,
        "delivery_city": req.delivery_city,
        "delivery_date": req.delivery_date,
        "estimated_min_unit": req.estimated_min_unit,
        "estimated_max_unit": req.estimated_max_unit,
        "estimated_min_total": req.estimated_min_total,
        "estimated_max_total": req.estimated_max_total,
        "answers": answers,
        "special_notes": req.special_notes
    }

    pdf_buffer = generate_gift_request_pdf(req_data)

    filename = f"Shvom_Commission_{req.reference_id}.pdf"
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"'
        }
    )


@router.get("/track/{identifier:path}")
def track_order_public(identifier: str, db: Session = Depends(get_db)):
    """
    Public tracking lookup endpoint by Invoice Number, Reference ID, or Transaction ID.
    Returns current stage, courier tracking details, and estimated delivery timeline.
    """
    from app.models.payment import PaymentRecord
    from sqlalchemy import or_

    clean_id = identifier.strip()

    def map_status_to_step(status_text: str) -> int:
        s = (status_text or "").lower()
        if "deliver" in s:
            return 6
        if any(k in s for k in ["ship", "dispatch", "transit", "out for"]):
            return 5
        if any(k in s for k in ["pack", "box", "inspect", "quality", "qa"]):
            return 4
        if any(k in s for k in ["engrav", "monogram", "emboss", "customiz", "detail"]):
            return 3
        if any(k in s for k in ["procur", "sourc", "curat", "material", "product"]):
            return 2
        return 1

    # 1. Search in GiftRequest
    req = db.query(GiftRequest).filter(
        or_(
            GiftRequest.invoice_no.ilike(clean_id),
            GiftRequest.reference_id.ilike(clean_id),
        )
    ).first()

    if req:
        status_val = req.tracking_status or (
            "Delivered" if req.status == "Closed"
            else "In Atelier Production" if req.status == "Confirmed"
            else "Order Confirmed"
        )
        return {
            "found": True,
            "invoice_no": req.invoice_no or req.reference_id,
            "reference_id": req.reference_id,
            "client_name": req.client_name,
            "occasion": req.occasion,
            "destination": req.delivery_city,
            "quantity": req.quantity,
            "tracking_status": status_val,
            "status_step": map_status_to_step(status_val),
            "courier_name": req.courier_name or "Atelier White-Glove Dispatch",
            "tracking_number": req.tracking_number,
            "tracking_url": req.tracking_url,
            "estimated_delivery": req.estimated_delivery or req.delivery_date,
            "tracking_notes": req.tracking_notes or "Commission confirmed and assigned to master artisan atelier.",
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "updated_at": req.updated_at.isoformat() if req.updated_at else None,
        }

    # 2. Search in PaymentRecord
    pay = db.query(PaymentRecord).filter(
        or_(
            PaymentRecord.invoice_no.ilike(clean_id),
            PaymentRecord.transaction_id.ilike(clean_id),
            PaymentRecord.reference_code.ilike(clean_id),
            PaymentRecord.order_id.ilike(clean_id),
        )
    ).first()

    if pay:
        status_val = pay.tracking_status or (
            "Delivered" if pay.status == "DELIVERED"
            else "Dispatched" if pay.status == "DISPATCHED"
            else "In Atelier Production"
        )
        return {
            "found": True,
            "invoice_no": pay.invoice_no or pay.transaction_id,
            "reference_id": pay.reference_code or pay.transaction_id,
            "client_name": pay.customer_name,
            "occasion": pay.purpose or "Bespoke Return Gifting",
            "destination": "Registered Address",
            "quantity": 1,
            "tracking_status": status_val,
            "status_step": map_status_to_step(status_val),
            "courier_name": pay.courier_name or "Blue Dart Express",
            "tracking_number": pay.tracking_number,
            "tracking_url": pay.tracking_url,
            "estimated_delivery": pay.estimated_delivery,
            "tracking_notes": pay.tracking_notes or "Payment verified; items are being curated in the atelier.",
            "created_at": pay.created_at.isoformat() if pay.created_at else None,
            "updated_at": pay.updated_at.isoformat() if pay.updated_at else None,
        }

    raise HTTPException(
        status_code=404,
        detail=f"No order or commission found matching '{clean_id}'. Please check your invoice number or reference code and try again."
    )
