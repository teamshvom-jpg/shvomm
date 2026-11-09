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
    Creates or updates a bill generated by the Admin directly in the database.
    Supports:
    - 'Generate an existing bill': Updates existing record by order_id or invoice_no
    - 'Date': Records custom invoice date entered by admin
    """
    is_existing = bool(payload.get("is_existing_bill"))
    req_id = payload.get("id") or payload.get("payment_id")
    req_order_id = payload.get("order_id")
    req_invoice_no = payload.get("invoice_no")

    existing_bill = None
    if is_existing:
        if req_id:
            existing_bill = db.query(PaymentRecord).filter(PaymentRecord.id == int(req_id)).first()
        if not existing_bill and req_invoice_no:
            existing_bill = db.query(PaymentRecord).filter(PaymentRecord.invoice_no == req_invoice_no.strip()).first()
        if not existing_bill and req_order_id:
            existing_bill = db.query(PaymentRecord).filter(PaymentRecord.order_id == req_order_id.strip()).first()

    unique_suffix = uuid.uuid4().hex[:8].upper()
    transaction_id = payload.get("transaction_id") or (existing_bill.transaction_id if existing_bill else f"VAS-BILL-{unique_suffix}")
    if not existing_bill and transaction_id:
        if db.query(PaymentRecord).filter(PaymentRecord.transaction_id == transaction_id).first():
            transaction_id = f"VAS-BILL-{unique_suffix}"
    order_id = req_order_id or (existing_bill.order_id if existing_bill else f"ORDER-{unique_suffix}")
    invoice_no = req_invoice_no or (existing_bill.invoice_no if existing_bill else None)
    if not invoice_no:
        year_str = "2026-27"
        while True:
            seq = 1000 + (uuid.uuid4().int % 9000)
            candidate = f"VAS/{year_str}/{seq}"
            if not db.query(PaymentRecord).filter(PaymentRecord.invoice_no == candidate).first():
                invoice_no = candidate
                break

    amount = float(payload.get("amount", existing_bill.amount if existing_bill else 0.0))
    customer_name = (payload.get("customer_name") or (existing_bill.customer_name if existing_bill else "Valued Patron")).strip()
    customer_email = (payload.get("customer_email") or (existing_bill.customer_email if existing_bill else "concierge@vasanta.in")).strip()
    customer_phone = payload.get("customer_phone", "").strip() if payload.get("customer_phone") else (existing_bill.customer_phone if existing_bill else None)
    reference_code = payload.get("reference_code", "").strip() if payload.get("reference_code") else (existing_bill.reference_code if existing_bill else None)
    purpose = payload.get("purpose", existing_bill.purpose if existing_bill else "Atelier Commission & Gifting Services")
    
    notes = payload.get("notes")
    if isinstance(notes, (dict, list)):
        notes = json.dumps(notes)
    elif notes is not None:
        notes = str(notes)
    elif existing_bill:
        notes = existing_bill.notes

    item_tracking_json = payload.get("item_tracking_json")
    if isinstance(item_tracking_json, list):
        item_tracking_json = json.dumps(item_tracking_json)
    elif item_tracking_json is not None:
        item_tracking_json = str(item_tracking_json)
    elif existing_bill:
        item_tracking_json = existing_bill.item_tracking_json

    tracking_number = payload.get("tracking_number") or (existing_bill.tracking_number if existing_bill else invoice_no)
    courier_name = payload.get("courier_name") or (existing_bill.courier_name if existing_bill else "Blue Dart Express")
    invoice_date = payload.get("invoice_date") or (existing_bill.invoice_date if existing_bill else None)

    # Determine created_at timestamp based on custom admin date
    custom_created_at = None
    if invoice_date:
        try:
            custom_created_at = datetime.strptime(invoice_date, "%Y-%m-%d")
        except Exception:
            try:
                custom_created_at = datetime.strptime(invoice_date, "%d/%m/%Y")
            except Exception:
                custom_created_at = None

    if existing_bill:
        # Update existing bill record in place
        existing_bill.amount = amount
        existing_bill.currency = payload.get("currency", existing_bill.currency or "INR")
        existing_bill.customer_name = customer_name
        existing_bill.customer_email = customer_email
        existing_bill.customer_phone = customer_phone
        existing_bill.reference_code = reference_code
        existing_bill.purpose = purpose
        existing_bill.payment_method = payload.get("payment_method", existing_bill.payment_method)
        existing_bill.status = payload.get("status", existing_bill.status)
        existing_bill.invoice_no = invoice_no
        existing_bill.tracking_status = payload.get("tracking_status", existing_bill.tracking_status)
        existing_bill.courier_name = courier_name
        existing_bill.tracking_number = tracking_number
        existing_bill.item_tracking_json = item_tracking_json
        existing_bill.notes = notes
        existing_bill.invoice_date = invoice_date
        if custom_created_at:
            existing_bill.created_at = custom_created_at
        existing_bill.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_bill)
        target_bill = existing_bill
    else:
        # Insert newly created bill record
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
            courier_name=courier_name,
            tracking_number=tracking_number,
            item_tracking_json=item_tracking_json,
            notes=notes,
            invoice_date=invoice_date,
            created_at=custom_created_at or datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(new_bill)
        db.commit()
        db.refresh(new_bill)
        target_bill = new_bill

    return {
        "success": True,
        "id": target_bill.id,
        "transaction_id": target_bill.transaction_id,
        "order_id": target_bill.order_id,
        "invoice_no": target_bill.invoice_no,
        "amount": target_bill.amount,
        "currency": target_bill.currency or "INR",
        "status": target_bill.status,
        "customer_name": target_bill.customer_name,
        "customer_email": target_bill.customer_email,
        "customer_phone": target_bill.customer_phone,
        "reference_code": target_bill.reference_code,
        "purpose": target_bill.purpose,
        "payment_method": target_bill.payment_method,
        "tracking_status": target_bill.tracking_status or "Order Confirmed",
        "courier_name": target_bill.courier_name,
        "tracking_number": target_bill.tracking_number,
        "notes": target_bill.notes,
        "invoice_date": target_bill.invoice_date,
        "created_at": target_bill.created_at.isoformat() if target_bill.created_at else None,
        "updated_at": target_bill.updated_at.isoformat() if target_bill.updated_at else None,
    }


@router.post("/payments/record-balance")
def record_balance_payment(
    payload: dict,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Admin endpoint to record a balance / partial payment directly without Cashfree PG redirection.
    Updates the parent bill's notes with extra_payments, updates remaining_amount and status,
    and creates a linked transaction record in the payments registry.
    """
    clean = (payload.get("order_id") or payload.get("invoice_no") or payload.get("identifier") or "").strip()
    if not clean:
        raise HTTPException(status_code=400, detail="Order ID or Invoice Number is required.")

    parent = db.query(PaymentRecord).filter(
        or_(
            PaymentRecord.order_id.ilike(clean),
            PaymentRecord.invoice_no.ilike(clean),
            PaymentRecord.transaction_id.ilike(clean),
            PaymentRecord.reference_code.ilike(clean),
        )
    ).order_by(PaymentRecord.id.asc()).first()

    if not parent:
        raise HTTPException(status_code=404, detail=f"No order found matching '{clean}'")

    raw_amt = payload.get("amount")
    try:
        amount = round(float(raw_amt), 2)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid payment amount.")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than zero.")

    payment_mode = (payload.get("payment_mode") or "Bank Transfer").strip()
    invoice_date = (payload.get("invoice_date") or "").strip()

    # Parse parent notes
    notes_data = {}
    try:
        notes_data = json.loads(parent.notes) if parent.notes else {}
    except Exception:
        notes_data = {}

    advance_amount = float(notes_data.get("advance_amount") or 0.0)
    advance_payment_mode = notes_data.get("advance_payment_mode") or "Bank Transfer"
    extra_payments = list(notes_data.get("extra_payments") or [])

    # Assign payment label (e.g. 2nd Payment, 3rd Payment, etc.)
    idx = len(extra_payments)
    num = idx + 2
    if num % 10 == 2 and num % 100 != 12:
        suffix = "nd"
    elif num % 10 == 3 and num % 100 != 13:
        suffix = "rd"
    else:
        suffix = "th"
    payment_label = payload.get("payment_label") or f"{num}{suffix} Payment"

    new_entry = {
        "label": payment_label,
        "amount": amount,
        "payment_mode": payment_mode,
        "date": invoice_date or datetime.utcnow().strftime("%Y-%m-%d"),
    }
    extra_payments.append(new_entry)
    notes_data["extra_payments"] = extra_payments

    taxable = float(notes_data.get("taxable") or 0.0)
    total_gst = float(notes_data.get("total_gst") or 0.0)
    total_billed = float(
        notes_data.get("grand_total")
        or notes_data.get("grandTotal")
        or (taxable + total_gst if (taxable + total_gst) > 0 else 0.0)
        or parent.amount
        or 0.0
    )

    total_paid_so_far = advance_amount + sum(float(p.get("amount") or 0.0) for p in extra_payments)
    new_remaining = max(0.0, round(total_billed - total_paid_so_far, 2))
    notes_data["remaining_amount"] = new_remaining

    parent.notes = json.dumps(notes_data)
    if new_remaining <= 0:
        parent.status = "PAID"
    else:
        parent.status = "PARTIAL"

    if invoice_date:
        parent.invoice_date = invoice_date

    parent.updated_at = datetime.utcnow()

    # Create linked transaction record for this payment
    txn_id = f"SHV-BAL-{uuid.uuid4().hex[:8].upper()}"
    custom_dt = None
    if invoice_date:
        try:
            custom_dt = datetime.strptime(invoice_date, "%Y-%m-%d")
        except Exception:
            try:
                custom_dt = datetime.strptime(invoice_date, "%d/%m/%Y")
            except Exception:
                custom_dt = None

    balance_record = PaymentRecord(
        transaction_id=txn_id,
        order_id=parent.order_id,
        invoice_no=parent.invoice_no,
        amount=amount,
        currency="INR",
        customer_name=parent.customer_name,
        customer_email=parent.customer_email,
        customer_phone=parent.customer_phone,
        reference_code=parent.reference_code or parent.order_id,
        purpose=f"Balance Payment ({payment_label}): {parent.invoice_no or parent.order_id}",
        payment_method=payment_mode,
        status="PAID",
        tracking_status=parent.tracking_status or "Order Confirmed",
        courier_name=parent.courier_name,
        tracking_number=parent.tracking_number,
        item_tracking_json=parent.item_tracking_json,
        notes=json.dumps({
            "action": "balance_payment",
            "parent_order_id": parent.order_id,
            "parent_invoice_no": parent.invoice_no,
            "payment_label": payment_label,
            "amount": amount,
            "payment_mode": payment_mode,
            "remaining_balance": new_remaining,
            "invoice_date": invoice_date,
        }),
        invoice_date=invoice_date or parent.invoice_date,
        created_at=custom_dt or datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(balance_record)
    db.commit()
    db.refresh(parent)
    db.refresh(balance_record)

    return {
        "success": True,
        "message": f"Payment of ₹{amount:,.2f} recorded successfully ({payment_label}).",
        "receipt": {
            "transaction_id": balance_record.transaction_id,
            "order_id": parent.order_id,
            "invoice_no": parent.invoice_no,
            "amount": total_billed,
            "customer_name": parent.customer_name,
            "customer_email": parent.customer_email,
            "customer_phone": parent.customer_phone,
            "customer_gstin": notes_data.get("customer_gstin", ""),
            "customer_address": notes_data.get("customer_address", ""),
            "place_of_supply": notes_data.get("place_of_supply", "Telangana"),
            "reference_code": parent.reference_code,
            "purpose": parent.purpose,
            "payment_method": payment_mode,
            "status": parent.status,
            "invoice_date": invoice_date or parent.invoice_date,
            "advance_amount": advance_amount,
            "advance_payment_mode": advance_payment_mode,
            "extra_payments": extra_payments,
            "remaining_amount": new_remaining,
            "remaining_payment_mode": notes_data.get("remaining_payment_mode", "Bank Transfer"),
            "now_paid_amount": amount,
            "now_paid_mode": payment_mode,
            "now_paid_label": payment_label,
            "notes": parent.notes,
            "items": notes_data.get("items") or [],
            "created_at": (custom_dt or datetime.utcnow()).isoformat(),
        },
        "parent": {
            "id": parent.id,
            "invoice_no": parent.invoice_no,
            "order_id": parent.order_id,
            "status": parent.status,
            "total_billed": total_billed,
            "total_paid": total_paid_so_far,
            "balance_due": new_remaining,
        }
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


@router.put("/payments/{payment_id}")
@router.patch("/payments/{payment_id}")
def update_payment_record(
    payment_id: int,
    payload: dict,
    current_admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Updates any field of an existing payment / invoice record.
    """
    payment = db.query(PaymentRecord).filter(PaymentRecord.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if "customer_name" in payload and payload["customer_name"] is not None:
        payment.customer_name = payload["customer_name"].strip()
    if "customer_email" in payload and payload["customer_email"] is not None:
        payment.customer_email = payload["customer_email"].strip()
    if "customer_phone" in payload:
        payment.customer_phone = payload["customer_phone"].strip() if payload["customer_phone"] else None
    if "amount" in payload and payload["amount"] is not None:
        payment.amount = float(payload["amount"])
    if "currency" in payload and payload["currency"]:
        payment.currency = payload["currency"].strip()
    if "status" in payload and payload["status"]:
        payment.status = payload["status"].strip()
    if "invoice_no" in payload:
        payment.invoice_no = payload["invoice_no"].strip() if payload["invoice_no"] else None
    if "order_id" in payload:
        payment.order_id = payload["order_id"].strip() if payload["order_id"] else None
    if "reference_code" in payload:
        payment.reference_code = payload["reference_code"].strip() if payload["reference_code"] else None
    if "purpose" in payload and payload["purpose"] is not None:
        payment.purpose = payload["purpose"].strip()
    if "payment_method" in payload and payload["payment_method"] is not None:
        payment.payment_method = payload["payment_method"].strip()
    if "invoice_date" in payload:
        payment.invoice_date = payload["invoice_date"].strip() if payload["invoice_date"] else None
    if "tracking_status" in payload and payload["tracking_status"]:
        payment.tracking_status = payload["tracking_status"].strip()
    if "courier_name" in payload:
        payment.courier_name = payload["courier_name"].strip() if payload["courier_name"] else None
    if "tracking_number" in payload:
        payment.tracking_number = payload["tracking_number"].strip() if payload["tracking_number"] else None
    if "tracking_url" in payload:
        payment.tracking_url = payload["tracking_url"].strip() if payload["tracking_url"] else None

    # Notes update
    if "notes" in payload:
        notes_val = payload["notes"]
        if isinstance(notes_val, (dict, list)):
            payment.notes = json.dumps(notes_val)
        elif notes_val is not None:
            payment.notes = str(notes_val)

    # Item tracking json update
    if "item_tracking_json" in payload:
        it_val = payload["item_tracking_json"]
        if isinstance(it_val, (dict, list)):
            payment.item_tracking_json = json.dumps(it_val)
        elif it_val is not None:
            payment.item_tracking_json = str(it_val)

    payment.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(payment)

    return {
        "success": True,
        "id": payment.id,
        "transaction_id": payment.transaction_id,
        "order_id": payment.order_id,
        "invoice_no": payment.invoice_no,
        "amount": payment.amount,
        "currency": payment.currency or "INR",
        "status": payment.status,
        "customer_name": payment.customer_name,
        "customer_email": payment.customer_email,
        "customer_phone": payment.customer_phone,
        "reference_code": payment.reference_code,
        "purpose": payment.purpose,
        "payment_method": payment.payment_method,
        "tracking_status": payment.tracking_status,
        "courier_name": payment.courier_name,
        "tracking_number": payment.tracking_number,
        "notes": payment.notes,
        "invoice_date": payment.invoice_date,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
        "updated_at": payment.updated_at.isoformat() if payment.updated_at else None,
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

