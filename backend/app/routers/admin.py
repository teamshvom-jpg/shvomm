import json
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.request import GiftRequest
from app.models.consultation import ConsultationBooking
from app.models.admin_user import AdminUser
from app.models.payment import PaymentRecord
from app.schemas.auth import Token, LoginRequest
from app.schemas.request import GiftRequestResponse, GiftRequestStatusUpdate
from app.schemas.consultation import ConsultationResponse
from app.services.auth import (
    verify_password,
    create_access_token,
    get_current_admin
)
from app.services.mailer import test_mail_diagnostics

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/login", response_model=Token)
def login(form_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or passphrase",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return Token(
        access_token=access_token,
        token_type="bearer",
        username=user.username,
        full_name=user.full_name
    )


@router.get("/requests")
def list_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(GiftRequest)
    if status_filter and status_filter != "All":
        query = query.filter(GiftRequest.status == status_filter)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                GiftRequest.reference_id.ilike(s),
                GiftRequest.client_name.ilike(s),
                GiftRequest.client_email.ilike(s),
                GiftRequest.delivery_city.ilike(s)
            )
        )
    total = query.count()
    items = query.order_by(GiftRequest.id.desc()).offset(offset).limit(limit).all()

    results = []
    for item in items:
        try:
            ans = json.loads(item.answers_json) if item.answers_json else {}
        except Exception:
            ans = {}
        results.append({
            "id": item.id,
            "reference_id": item.reference_id,
            "occasion": item.occasion,
            "client_name": item.client_name,
            "client_email": item.client_email,
            "client_phone": item.client_phone,
            "delivery_city": item.delivery_city,
            "delivery_date": item.delivery_date,
            "quantity": item.quantity,
            "budget_per_gift": item.budget_per_gift,
            "estimated_min_unit": item.estimated_min_unit,
            "estimated_max_unit": item.estimated_max_unit,
            "estimated_min_total": item.estimated_min_total,
            "estimated_max_total": item.estimated_max_total,
            "status": item.status,
            "answers": ans,
            "logo_url": item.logo_url,
            "reference_image_url": item.reference_image_url,
            "special_notes": item.special_notes,
            "admin_notes": item.admin_notes,
            "created_at": item.created_at,
            "updated_at": item.updated_at
        })

    return {
        "total": total,
        "items": results
    }


@router.get("/requests/{req_id}", response_model=GiftRequestResponse)
def get_request_detail(
    req_id: int,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    item = db.query(GiftRequest).filter(GiftRequest.id == req_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Commission request not found")

    ans = json.loads(item.answers_json) if item.answers_json else {}
    return GiftRequestResponse(
        id=item.id,
        reference_id=item.reference_id,
        occasion=item.occasion,
        client_name=item.client_name,
        client_email=item.client_email,
        client_phone=item.client_phone,
        delivery_city=item.delivery_city,
        delivery_date=item.delivery_date,
        quantity=item.quantity,
        budget_per_gift=item.budget_per_gift,
        estimated_min_unit=item.estimated_min_unit,
        estimated_max_unit=item.estimated_max_unit,
        estimated_min_total=item.estimated_min_total,
        estimated_max_total=item.estimated_max_total,
        status=item.status,
        answers=ans,
        logo_url=item.logo_url,
        reference_image_url=item.reference_image_url,
        special_notes=item.special_notes,
        admin_notes=item.admin_notes,
        created_at=item.created_at,
        updated_at=item.updated_at
    )


@router.patch("/requests/{req_id}/tracking")
def update_request_tracking(
    req_id: int,
    payload: dict,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Updates logistics tracking information for a commission request.
    Supports per-item tracking via `item_trackings` list:
      [{item_label, courier_name, tracking_number, tracking_url, tracking_notes}]
    """
    item = db.query(GiftRequest).filter(GiftRequest.id == req_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Commission request not found")

    if "invoice_no" in payload:
        item.invoice_no = payload["invoice_no"].strip() if payload["invoice_no"] else None
    if "tracking_status" in payload:
        item.tracking_status = payload["tracking_status"].strip() if payload["tracking_status"] else item.tracking_status
    if "courier_name" in payload:
        item.courier_name = payload["courier_name"].strip() if payload["courier_name"] else None
    if "tracking_number" in payload:
        item.tracking_number = payload["tracking_number"].strip() if payload["tracking_number"] else None
    if "tracking_url" in payload:
        item.tracking_url = payload["tracking_url"].strip() if payload["tracking_url"] else None
    if "estimated_delivery" in payload:
        item.estimated_delivery = payload["estimated_delivery"].strip() if payload["estimated_delivery"] else None
    if "tracking_notes" in payload:
        item.tracking_notes = payload["tracking_notes"].strip() if payload["tracking_notes"] else None

    # Per-item tracking array
    if "item_trackings" in payload:
        raw = payload["item_trackings"]
        if isinstance(raw, list):
            item.item_tracking_json = json.dumps(raw)
        else:
            item.item_tracking_json = None

    # Sync main status if delivered or confirmed
    if item.tracking_status == "Delivered":
        item.status = "Closed"
    elif item.tracking_status in ["In Atelier Production", "Dispatched / In Transit", "Quality Inspection"]:
        item.status = "Confirmed"

    db.commit()
    db.refresh(item)

    item_trackings = []
    if item.item_tracking_json:
        try:
            item_trackings = json.loads(item.item_tracking_json)
        except Exception:
            item_trackings = []

    return {
        "success": True,
        "reference_id": item.reference_id,
        "invoice_no": item.invoice_no,
        "tracking_status": item.tracking_status,
        "courier_name": item.courier_name,
        "tracking_number": item.tracking_number,
        "tracking_url": item.tracking_url,
        "estimated_delivery": item.estimated_delivery,
        "tracking_notes": item.tracking_notes,
        "item_trackings": item_trackings,
    }


@router.patch("/requests/{req_id}", response_model=GiftRequestResponse)
def update_request_status(
    req_id: int,
    payload: GiftRequestStatusUpdate,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    item = db.query(GiftRequest).filter(GiftRequest.id == req_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Commission request not found")

    if payload.status:
        item.status = payload.status
    if payload.admin_notes is not None:
        item.admin_notes = payload.admin_notes

    db.commit()
    db.refresh(item)

    ans = json.loads(item.answers_json) if item.answers_json else {}
    return GiftRequestResponse(
        id=item.id,
        reference_id=item.reference_id,
        occasion=item.occasion,
        client_name=item.client_name,
        client_email=item.client_email,
        client_phone=item.client_phone,
        delivery_city=item.delivery_city,
        delivery_date=item.delivery_date,
        quantity=item.quantity,
        budget_per_gift=item.budget_per_gift,
        estimated_min_unit=item.estimated_min_unit,
        estimated_max_unit=item.estimated_max_unit,
        estimated_min_total=item.estimated_min_total,
        estimated_max_total=item.estimated_max_total,
        status=item.status,
        answers=ans,
        logo_url=item.logo_url,
        reference_image_url=item.reference_image_url,
        special_notes=item.special_notes,
        admin_notes=item.admin_notes,
        created_at=item.created_at,
        updated_at=item.updated_at
    )


@router.get("/payments")
def list_payments(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(PaymentRecord)
    if status_filter and status_filter != "All":
        query = query.filter(PaymentRecord.status == status_filter)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                PaymentRecord.transaction_id.ilike(s),
                PaymentRecord.order_id.ilike(s),
                PaymentRecord.invoice_no.ilike(s),
                PaymentRecord.customer_name.ilike(s),
                PaymentRecord.customer_email.ilike(s),
                PaymentRecord.customer_phone.ilike(s),
                PaymentRecord.reference_code.ilike(s)
            )
        )
    total = query.count()
    items = query.order_by(PaymentRecord.id.desc()).offset(offset).limit(limit).all()

    results = []
    for p in items:
        results.append({
            "id": p.id,
            "transaction_id": p.transaction_id,
            "order_id": p.order_id,
            "cf_order_id": p.cf_order_id,
            "amount": p.amount,
            "currency": p.currency or "INR",
            "customer_name": p.customer_name,
            "customer_email": p.customer_email,
            "customer_phone": p.customer_phone,
            "reference_code": p.reference_code,
            "purpose": p.purpose,
            "payment_method": p.payment_method,
            "status": p.status,
            "invoice_no": p.invoice_no,
            "tracking_status": p.tracking_status or "Order Confirmed",
            "courier_name": p.courier_name,
            "tracking_number": p.tracking_number,
            "tracking_url": p.tracking_url,
            "estimated_delivery": p.estimated_delivery,
            "tracking_notes": p.tracking_notes,
            "notes": p.notes,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        })
    return {"total": total, "items": results}


@router.post("/bills")
def create_admin_bill(
    payload: dict,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Creates and records a bill generated by the Admin directly into the database.
    """
    unique_suffix = uuid.uuid4().hex[:8].upper()
    transaction_id = payload.get("transaction_id") or f"VAS-BILL-{unique_suffix}"
    order_id = payload.get("order_id") or f"ORDER-{unique_suffix}"
    invoice_no = payload.get("invoice_no")
    if not invoice_no:
        year_str = "2026-27"
        count = db.query(PaymentRecord).count() + 1
        invoice_no = f"VAS/{year_str}/{count:04d}"

    amount = float(payload.get("amount", 0.0))
    customer_name = (payload.get("customer_name") or "Valued Patron").strip()
    customer_email = (payload.get("customer_email") or "concierge@vasanta.in").strip()
    customer_phone = payload.get("customer_phone", "").strip() if payload.get("customer_phone") else None
    reference_code = payload.get("reference_code", "").strip() if payload.get("reference_code") else None
    purpose = payload.get("purpose", "Atelier Commission & Gifting Services")
    
    notes = payload.get("notes")
    if isinstance(notes, (dict, list)):
        notes = json.dumps(notes)
    elif notes is not None:
        notes = str(notes)

    new_bill = PaymentRecord(
        transaction_id=transaction_id,
        order_id=order_id,
        amount=amount,
        currency=payload.get("currency", "INR"),
        customer_name=customer_name,
        customer_email=customer_email,
        customer_phone=customer_phone,
        reference_code=reference_code,
        purpose=purpose,
        payment_method=payload.get("payment_method", "Admin Generated Bill"),
        status=payload.get("status", "PAID"),
        invoice_no=invoice_no,
        tracking_status=payload.get("tracking_status", "Order Confirmed"),
        notes=notes,
        created_at=datetime.utcnow(),
    )
    db.add(new_bill)
    db.commit()
    db.refresh(new_bill)

    return {
        "success": True,
        "id": new_bill.id,
        "transaction_id": new_bill.transaction_id,
        "order_id": new_bill.order_id,
        "invoice_no": new_bill.invoice_no,
        "amount": new_bill.amount,
        "status": new_bill.status,
        "customer_name": new_bill.customer_name,
        "customer_email": new_bill.customer_email,
        "customer_phone": new_bill.customer_phone,
        "purpose": new_bill.purpose,
        "created_at": new_bill.created_at.isoformat() if new_bill.created_at else None
    }


@router.patch("/payments/{payment_id}/tracking")
def update_payment_tracking(
    payment_id: int,
    payload: dict,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Updates logistics tracking for a payment record.
    Supports per-item tracking via `item_trackings` list:
      [{item_label, courier_name, tracking_number, tracking_url, tracking_notes}]
    """
    payment = db.query(PaymentRecord).filter(PaymentRecord.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if "invoice_no" in payload:
        payment.invoice_no = payload["invoice_no"].strip() if payload["invoice_no"] else None
    if "tracking_status" in payload:
        payment.tracking_status = payload["tracking_status"].strip() if payload["tracking_status"] else payment.tracking_status
    if "courier_name" in payload:
        payment.courier_name = payload["courier_name"].strip() if payload["courier_name"] else None
    if "tracking_number" in payload:
        payment.tracking_number = payload["tracking_number"].strip() if payload["tracking_number"] else None
    if "tracking_url" in payload:
        payment.tracking_url = payload["tracking_url"].strip() if payload["tracking_url"] else None
    if "estimated_delivery" in payload:
        payment.estimated_delivery = payload["estimated_delivery"].strip() if payload["estimated_delivery"] else None
    if "tracking_notes" in payload:
        payment.tracking_notes = payload["tracking_notes"].strip() if payload["tracking_notes"] else None

    # Per-item tracking array
    if "item_trackings" in payload:
        raw = payload["item_trackings"]
        if isinstance(raw, list):
            payment.item_tracking_json = json.dumps(raw)
        else:
            payment.item_tracking_json = None

    db.commit()
    db.refresh(payment)

    item_trackings = []
    if payment.item_tracking_json:
        try:
            item_trackings = json.loads(payment.item_tracking_json)
        except Exception:
            item_trackings = []

    return {
        "success": True,
        "id": payment.id,
        "invoice_no": payment.invoice_no,
        "tracking_status": payment.tracking_status,
        "courier_name": payment.courier_name,
        "tracking_number": payment.tracking_number,
        "tracking_url": payment.tracking_url,
        "estimated_delivery": payment.estimated_delivery,
        "tracking_notes": payment.tracking_notes,
        "item_trackings": item_trackings,
    }


@router.get("/consultations", response_model=List[ConsultationResponse])
def list_consultations(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    return db.query(ConsultationBooking).order_by(ConsultationBooking.id.desc()).all()


@router.get("/stats")
def get_dashboard_stats(
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    total_reqs = db.query(GiftRequest).count()
    new_reqs = db.query(GiftRequest).filter(GiftRequest.status == "New").count()
    quoted_reqs = db.query(GiftRequest).filter(GiftRequest.status == "Quoted").count()
    confirmed_reqs = db.query(GiftRequest).filter(GiftRequest.status == "Confirmed").count()
    total_consultations = db.query(ConsultationBooking).count()

    # Payment statistics: include all test, deployment, and admin-generated payments
    total_payments = db.query(PaymentRecord).count()
    paid_payments_query = db.query(PaymentRecord).filter(
        or_(
            PaymentRecord.status == "PAID",
            PaymentRecord.status == "Completed",
            PaymentRecord.status == "BILLED",
            PaymentRecord.status == "SUCCESS"
        )
    )
    paid_payments = paid_payments_query.count()
    total_revenue = sum(p.amount for p in paid_payments_query.all()) if paid_payments > 0 else 0.0

    return {
        "total_requests": total_reqs,
        "new_requests": new_reqs,
        "quoted_requests": quoted_reqs,
        "confirmed_requests": confirmed_reqs,
        "total_consultations": total_consultations,
        "total_payments": total_payments,
        "paid_payments": paid_payments,
        "total_revenue": round(total_revenue, 2),
    }


@router.get("/test-email")
@router.post("/test-email")
def run_email_diagnostic(
    target: Optional[str] = Query(None, description="Optional target email to test sending to"),
    current_admin: AdminUser = Depends(get_current_admin)
):
    """
    Live diagnostic test: verifies environment variables, attempts test email delivery,
    and returns exact connection / authentication details.
    """
    return test_mail_diagnostics(target_email=target)

