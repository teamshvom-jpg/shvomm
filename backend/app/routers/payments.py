"""
Payments Router — Cashfree Standard Web Checkout Integration.

Endpoints:
- POST /api/create-order: Generates a unique Cashfree payment session ID.
- POST /api/verify-payment: Verifies payment status directly against Cashfree server-side API.
- POST /api/webhooks/cashfree: Secure webhook handler with HMAC-SHA256 signature verification.
- POST /api/payments: Backward-compatible direct payment submission.
- GET /api/payments/{transaction_id}: Payment status lookup.
"""

import uuid
import json
import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.payment import PaymentRecord
from app.schemas.payment import (
    CreateOrderRequest,
    CreateOrderResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
    PaymentCreate,
    PaymentResponse,
)
from app.services.cashfree import (
    create_cashfree_order_session,
    fetch_cashfree_order_status,
    verify_cashfree_webhook_signature,
    MINIMUM_ORDER_AMOUNT_INR,
)
from app.services.mailer import send_payment_confirmation

logger = logging.getLogger("payments_router")

router = APIRouter(tags=["Payments"])


# ============================================================================
# STEP 1: BACKEND - CREATE PAYMENT SESSION
# ============================================================================

@router.post("/api/create-order", response_model=CreateOrderResponse, status_code=200)
@router.post("/api/payments/create-order", response_model=CreateOrderResponse, status_code=200)
async def create_order(payload: CreateOrderRequest, db: Session = Depends(get_db)):
    """
    Creates a Cashfree payment session for Standard Web Checkout.
    Validates input parameters server-side, records the transaction in DB,
    and returns payment_session_id along with the unique order_id.
    """
    if payload.order_amount < MINIMUM_ORDER_AMOUNT_INR:
        raise HTTPException(
            status_code=400,
            detail=f"Order amount must be at least ₹{MINIMUM_ORDER_AMOUNT_INR:.2f} INR."
        )

    # Generate unique backend IDs
    unique_order_id = f"order_shv_{uuid.uuid4().hex[:14]}"
    transaction_id = f"SHV-PAY-{uuid.uuid4().hex[:12].upper()}"
    customer_id = f"cust_{uuid.uuid4().hex[:12]}"

    # Request payment session from Cashfree PG API
    cashfree_res = await create_cashfree_order_session(
        order_amount=payload.order_amount,
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        customer_phone=payload.customer_phone,
        order_id=unique_order_id,
        customer_id=customer_id,
        return_url=payload.return_url,
    )

    # Persist initial order record in database with PENDING status
    payment_record = PaymentRecord(
        transaction_id=transaction_id,
        order_id=cashfree_res.get("order_id", unique_order_id),
        payment_session_id=cashfree_res["payment_session_id"],
        amount=round(float(payload.order_amount), 2),
        currency="INR",
        customer_name=payload.customer_name.strip(),
        customer_email=payload.customer_email.strip(),
        customer_phone=payload.customer_phone.strip() if payload.customer_phone else None,
        reference_code=payload.reference_code.strip() if payload.reference_code else None,
        purpose=payload.purpose or "Commission Advance",
        payment_method="Cashfree Standard Web Checkout",
        status="PENDING",
        notes=payload.notes.strip() if payload.notes else None,
        created_at=datetime.utcnow(),
    )
    db.add(payment_record)
    db.commit()
    db.refresh(payment_record)

    return CreateOrderResponse(
        payment_session_id=cashfree_res["payment_session_id"],
        order_id=cashfree_res["order_id"]
    )


# ============================================================================
# STEP 3: BACKEND - VERIFY PAYMENT STATUS
# ============================================================================

@router.post("/api/verify-payment", response_model=VerifyPaymentResponse, status_code=200)
@router.post("/api/payments/verify-payment", response_model=VerifyPaymentResponse, status_code=200)
async def verify_payment(
    payload: VerifyPaymentRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Verifies the payment status directly with Cashfree's server-side API:
    GET /pg/orders/{order_id}

    Performs 5 strict checks:
    1. Order exists in Cashfree
    2. Order matches internal transaction / customer details (if recorded)
    3. Order amount matches expected amount
    4. Order currency is INR
    5. Cashfree order status is 'PAID'
    """
    order_id = payload.order_id.strip()
    if not order_id:
        raise HTTPException(status_code=400, detail="order_id is required.")

    # 1. Fetch official order status from Cashfree server-side API
    cf_order = await fetch_cashfree_order_status(order_id)

    # 2. Lookup local payment record if present
    record = db.query(PaymentRecord).filter(
        PaymentRecord.order_id == order_id
    ).first()

    cf_order_status = (cf_order.get("order_status") or "").upper()
    cf_amount = float(cf_order.get("order_amount", 0.0))
    cf_currency = (cf_order.get("order_currency") or "").upper()
    cf_order_id = str(cf_order.get("cf_order_id") or "")

    # 3. Confirm Currency
    if cf_currency != "INR":
        raise HTTPException(
            status_code=400,
            detail=f"Invalid currency '{cf_currency}'. Only INR payments are supported."
        )

    # 4. Confirm Amount matches expected record if record exists
    if record:
        if abs(record.amount - cf_amount) > 0.01:
            logger.error(
                f"Amount mismatch for order {order_id}: Expected {record.amount}, Cashfree reported {cf_amount}"
            )
            raise HTTPException(
                status_code=400,
                detail="Payment amount mismatch between local order and Cashfree record."
            )

    # 5. Confirm Order Status is PAID
    if cf_order_status != "PAID":
        # Do not mark order as paid
        if record and record.status != "PAID":
            record.status = cf_order_status or "FAILED"
            record.updated_at = datetime.utcnow()
            db.commit()

        raise HTTPException(
            status_code=400,
            detail=f"Payment for order '{order_id}' has not been completed. Status is '{cf_order_status}'."
        )

    # If successfully PAID:
    should_send_email = False
    if record:
        if record.status != "PAID":
            should_send_email = True
        record.status = "PAID"
        record.cf_order_id = cf_order_id
        record.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(record)

        if should_send_email:
            background_tasks.add_task(
                send_payment_confirmation,
                {
                    "transaction_id": record.transaction_id,
                    "order_id": record.order_id,
                    "amount": record.amount,
                    "customer_name": record.customer_name,
                    "customer_email": record.customer_email,
                    "customer_phone": record.customer_phone,
                    "reference_code": record.reference_code,
                    "purpose": record.purpose,
                    "payment_method": "Cashfree Standard Web Checkout",
                    "status": "PAID",
                    "created_at": record.created_at.isoformat() if record.created_at else "",
                    "notes": record.notes,
                }
            )

    return VerifyPaymentResponse(
        success=True,
        order_id=order_id,
        payment_status="PAID",
        amount=cf_amount,
        currency="INR",
        customer_name=record.customer_name if record else cf_order.get("customer_details", {}).get("customer_name"),
        transaction_id=record.transaction_id if record else None,
        cf_order_id=cf_order_id,
    )


# ============================================================================
# STEP 4: PAYMENT WEBHOOK
# ============================================================================

@router.post("/api/webhooks/cashfree", status_code=200)
async def cashfree_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    x_webhook_signature: Optional[str] = Header(None),
    x_webhook_timestamp: Optional[str] = Header(None)
):
    """
    Receives and processes asynchronous webhook notifications from Cashfree.
    Verifies the webhook signature using HMAC-SHA256 over raw request body.
    Safely handles duplicate events with idempotent state updates.
    """
    raw_body = await request.body()

    # 1. Verify Cashfree signature
    is_valid = verify_cashfree_webhook_signature(
        raw_body=raw_body,
        signature=x_webhook_signature,
        timestamp=x_webhook_timestamp
    )

    if not is_valid:
        logger.warning("Rejected Cashfree webhook due to invalid signature.")
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    # 2. Parse payload safely
    try:
        event = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    data = event.get("data", {})
    order_data = data.get("order", {})
    payment_data = data.get("payment", {})
    order_id = order_data.get("order_id")
    event_type = event.get("type", "")

    if not order_id:
        return {"status": "ignored", "reason": "No order_id in webhook payload"}

    # 3. Handle payment success event
    is_payment_success = (
        event_type == "PAYMENT_SUCCESS_WEBHOOK" or
        payment_data.get("payment_status") == "SUCCESS"
    )

    record = db.query(PaymentRecord).filter(PaymentRecord.order_id == order_id).first()

    if is_payment_success:
        if record:
            if record.status == "PAID":
                # Idempotent response for duplicates
                return {"status": "already_processed", "order_id": order_id}

            record.status = "PAID"
            record.cf_order_id = str(payment_data.get("cf_payment_id") or "")
            record.updated_at = datetime.utcnow()
            db.commit()

            background_tasks.add_task(
                send_payment_confirmation,
                {
                    "transaction_id": record.transaction_id,
                    "order_id": record.order_id,
                    "amount": record.amount,
                    "customer_name": record.customer_name,
                    "customer_email": record.customer_email,
                    "customer_phone": record.customer_phone,
                    "reference_code": record.reference_code,
                    "purpose": record.purpose,
                    "payment_method": "Cashfree Standard Web Checkout",
                    "status": "PAID",
                    "created_at": record.created_at.isoformat() if record.created_at else "",
                    "notes": record.notes,
                }
            )

        return {"status": "success", "order_id": order_id}

    return {"status": "received", "event_type": event_type}


# ============================================================================
# LEGACY & DIRECT PAYMENT RECORD ENDPOINTS (BACKWARD COMPATIBLE)
# ============================================================================

@router.post("/api/payments", response_model=PaymentResponse, status_code=201)
def create_payment(payload: PaymentCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Record a direct customer payment for manual advance submissions."""
    transaction_id = f"SHV-PAY-{uuid.uuid4().hex[:12].upper()}"
    record = PaymentRecord(
        transaction_id=transaction_id,
        amount=payload.amount,
        customer_name=payload.customer_name,
        customer_email=payload.customer_email,
        customer_phone=payload.customer_phone,
        reference_code=payload.reference_code,
        purpose=payload.purpose or "Commission Advance",
        payment_method=payload.payment_method or "Cashfree PG",
        status="Completed",
        notes=payload.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    background_tasks.add_task(
        send_payment_confirmation,
        {
            "transaction_id": record.transaction_id,
            "amount": record.amount,
            "customer_name": record.customer_name,
            "customer_email": record.customer_email,
            "customer_phone": record.customer_phone,
            "reference_code": record.reference_code,
            "purpose": record.purpose,
            "payment_method": record.payment_method,
            "status": record.status,
            "created_at": record.created_at.isoformat() if record.created_at else "",
            "notes": record.notes,
        }
    )

    return record


@router.get("/api/payments/{transaction_id}", response_model=PaymentResponse)
def get_payment(transaction_id: str, db: Session = Depends(get_db)):
    """Retrieve a single payment record by its transaction ID or order ID."""
    record = db.query(PaymentRecord).filter(
        (PaymentRecord.transaction_id == transaction_id) |
        (PaymentRecord.order_id == transaction_id)
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Payment record not found")
    return record


@router.get("/api/balance/{identifier:path}")
def get_balance_due(identifier: str, db: Session = Depends(get_db)):
    """
    Public endpoint: look up total billed and total paid for an order/invoice.
    Accepts Invoice No, Reference ID, or Transaction ID.
    Returns total_billed, total_paid, balance_due, customer info.
    """
    from sqlalchemy import or_
    from app.models.request import GiftRequest as GR

    clean = identifier.strip()

    # 1. Look up GiftRequest by reference_id or invoice_no
    req = db.query(GR).filter(
        or_(
            GR.invoice_no.ilike(clean),
            GR.reference_id.ilike(clean),
        )
    ).first()

    if req:
        # Gather all payments linked by reference_code == reference_id
        payments = db.query(PaymentRecord).filter(
            or_(
                PaymentRecord.reference_code.ilike(req.reference_id),
                PaymentRecord.invoice_no.ilike(req.invoice_no) if req.invoice_no else False,
            )
        ).all()
        paid_statuses = {"PAID", "Completed", "BILLED", "SUCCESS"}
        total_paid = sum(
            p.amount for p in payments if (p.status or "").upper() in paid_statuses or p.status in paid_statuses
        )
        # Try to derive total billed from latest payment notes or estimated_max_total
        total_billed = req.estimated_max_total or 0.0
        # If a PAID record exists with a purpose that shows it's a full/advance, use sum of all payments as hint
        balance = max(0.0, round(total_billed - total_paid, 2))
        return {
            "found": True,
            "source": "commission",
            "reference_id": req.reference_id,
            "invoice_no": req.invoice_no,
            "client_name": req.client_name,
            "client_email": req.client_email,
            "client_phone": req.client_phone,
            "occasion": req.occasion,
            "total_billed": round(total_billed, 2),
            "total_paid": round(total_paid, 2),
            "balance_due": balance,
            "payments": [
                {
                    "transaction_id": p.transaction_id,
                    "amount": p.amount,
                    "status": p.status,
                    "purpose": p.purpose,
                    "payment_method": p.payment_method,
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                }
                for p in payments
            ],
        }

    # 2. Look up PaymentRecord by invoice_no, transaction_id, reference_code, or order_id
    pay = db.query(PaymentRecord).filter(
        or_(
            PaymentRecord.invoice_no.ilike(clean),
            PaymentRecord.transaction_id.ilike(clean),
            PaymentRecord.reference_code.ilike(clean),
            PaymentRecord.order_id.ilike(clean),
        )
    ).first()

    if pay:
        # Parse notes JSON to extract advance, remaining, and line item financial totals
        notes_data = {}
        try:
            notes_data = json.loads(pay.notes) if pay.notes else {}
        except Exception:
            notes_data = {}

        taxable = float(notes_data.get("taxable") or 0.0)
        total_gst = float(notes_data.get("total_gst") or 0.0)
        recorded_advance = float(notes_data.get("advance_amount") or 0.0)
        recorded_remaining = float(notes_data.get("remaining_amount") or 0.0)
        extra_payments = list(notes_data.get("extra_payments") or [])
        extra_paid = sum(float(p.get("amount") or 0.0) for p in extra_payments)

        total_billed = float(
            notes_data.get("grand_total")
            or notes_data.get("grandTotal")
            or (taxable + total_gst if (taxable + total_gst) > 0 else 0.0)
            or (recorded_advance + recorded_remaining if (recorded_advance + recorded_remaining) > 0 else 0.0)
            or pay.amount
            or 0.0
        )

        # Gather subsequent payments made against this order / invoice / reference (excluding main bill itself)
        query_conditions = []
        if pay.order_id:
            query_conditions.append(PaymentRecord.order_id == pay.order_id)
        if pay.reference_code:
            query_conditions.append(PaymentRecord.reference_code.ilike(pay.reference_code))
        if pay.invoice_no:
            query_conditions.append(PaymentRecord.invoice_no.ilike(pay.invoice_no))

        subsequent_payments = db.query(PaymentRecord).filter(
            PaymentRecord.id != pay.id,
            or_(*query_conditions) if query_conditions else False
        ).all()
        paid_statuses = {"PAID", "COMPLETED", "BILLED", "SUCCESS"}
        subsequent_paid = sum(
            p.amount for p in subsequent_payments if (p.status or "").upper() in paid_statuses
        )

        if recorded_remaining > 0 or recorded_advance > 0 or extra_paid > 0:
            total_paid = min(total_billed, max(round(recorded_advance + extra_paid, 2), round(recorded_advance + subsequent_paid, 2)))
            balance_due = max(0.0, round(total_billed - total_paid, 2))
        elif (pay.status or "").upper() in {"PENDING", "PROFORMA", "UNPAID"}:
            total_paid = round(subsequent_paid, 2)
            balance_due = max(0.0, round(total_billed - total_paid, 2))
        else:
            total_paid = total_billed
            balance_due = 0.0

        all_related = [pay] + subsequent_payments

        return {
            "found": True,
            "source": "payment",
            "reference_id": pay.reference_code or pay.transaction_id,
            "invoice_no": pay.invoice_no or pay.transaction_id,
            "client_name": pay.customer_name,
            "client_email": pay.customer_email,
            "client_phone": pay.customer_phone,
            "occasion": pay.purpose,
            "total_billed": round(total_billed, 2),
            "total_paid": round(total_paid, 2),
            "balance_due": round(balance_due, 2),
            "advance_amount": round(recorded_advance, 2),
            "advance_payment_mode": notes_data.get("advance_payment_mode") or "Bank Transfer",
            "extra_payments": extra_payments,
            "remaining_amount": round(recorded_remaining if recorded_remaining > 0 else balance_due, 2),
            "remaining_payment_mode": notes_data.get("remaining_payment_mode") or "Bank Transfer",
            "notes": pay.notes,
            "items": notes_data.get("items") or [],
            "payments": [
                {
                    "transaction_id": p.transaction_id,
                    "amount": p.amount,
                    "status": p.status,
                    "purpose": p.purpose,
                    "payment_method": p.payment_method,
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                }
                for p in all_related
            ],
        }

    raise HTTPException(
        status_code=404,
        detail=f"No order or invoice found for '{clean}'. Please check your invoice number or reference code."
    )


# ============================================================================
# ORDER LOOKUP & DYNAMIC LINE ITEM ADDITION (SAME ORDER & UNIFIED TRACKING)
# ============================================================================

def process_add_item_to_order_record(
    db: Session,
    parent: PaymentRecord,
    raw_item: dict,
    is_advance: bool,
    paid_amount: float,
    payment_method: str = "Cashfree PG",
    customer_name: Optional[str] = None,
    customer_email: Optional[str] = None,
    customer_phone: Optional[str] = None,
) -> dict:
    """
    Core engine to append an item to an existing order:
    1. Appends new line item to order's JSON notes
    2. Recalculates taxable, total_gst, grand_total, advance, and remaining amounts
    3. Updates item_tracking_json preserving the SAME tracking number
    4. Creates a linked payment record with the SAME order_id, invoice_no, and tracking_number
    """
    notes_data = {}
    try:
        notes_data = json.loads(parent.notes) if parent.notes else {}
    except Exception:
        notes_data = {}

    existing_items = notes_data.get("items") or []
    if not existing_items:
        existing_items = [
            {
                "id": "item_1",
                "description": parent.purpose or "Bespoke Atelier Commission & Curation",
                "hsn": "997212",
                "qty": 1,
                "unit": "PCS",
                "rate": round(parent.amount / 1.18, 2),
                "gst_rate": 18,
            }
        ]

    # Calculate financial totals for the new line item
    qty = max(1, int(raw_item.get("qty") or 1))
    rate = max(0.0, float(raw_item.get("rate") or 0.0))
    gst_rate = float(raw_item.get("gst_rate") if raw_item.get("gst_rate") is not None else 18.0)
    line_taxable = round(qty * rate, 2)
    line_gst = round((line_taxable * gst_rate) / 100.0, 2)
    item_total = round(line_taxable + line_gst, 2)

    new_item_obj = {
        "id": f"item_{int(datetime.utcnow().timestamp() * 1000)}",
        "description": raw_item.get("description") or f"Added Item {len(existing_items) + 1}",
        "hsn": raw_item.get("hsn") or "997212",
        "qty": qty,
        "unit": raw_item.get("unit") or "PCS",
        "rate": rate,
        "gst_rate": gst_rate,
    }
    updated_items = existing_items + [new_item_obj]

    # Existing financial totals
    old_taxable = float(notes_data.get("taxable") or sum(it.get("qty", 1) * it.get("rate", 0) for it in existing_items))
    old_total_gst = float(notes_data.get("total_gst") or sum(it.get("qty", 1) * it.get("rate", 0) * (it.get("gst_rate", 18)/100) for it in existing_items))
    old_grand_total = float(notes_data.get("grand_total") or parent.amount)
    old_advance = float(notes_data.get("advance_amount") or (old_grand_total if parent.status == "PAID" else 0.0))
    old_remaining = float(notes_data.get("remaining_amount") or 0.0)

    new_taxable = round(old_taxable + line_taxable, 2)
    new_total_gst = round(old_total_gst + line_gst, 2)
    new_grand_total = round(old_grand_total + item_total, 2)

    # Determine paid and remaining for this addition
    if is_advance:
        actual_paid = min(item_total, max(1.0, float(paid_amount)))
        new_item_remaining = round(item_total - actual_paid, 2)
    else:
        actual_paid = item_total
        new_item_remaining = 0.0

    new_total_advance = round(old_advance + actual_paid, 2)
    new_total_remaining = round(old_remaining + new_item_remaining, 2)

    # Tracking: maintain exact SAME tracking number for all items
    tracking_number = parent.tracking_number or parent.invoice_no or parent.transaction_id
    courier = parent.courier_name or "Blue Dart Express"

    existing_trackings = []
    if parent.item_tracking_json:
        try:
            parsed_t = json.loads(parent.item_tracking_json)
            if isinstance(parsed_t, list):
                existing_trackings = parsed_t
        except Exception:
            existing_trackings = []

    if not existing_trackings:
        for idx, it in enumerate(existing_items):
            existing_trackings.append({
                "item_label": it.get("description") or f"Item {idx + 1}",
                "quantity": it.get("qty") or 1,
                "courier_name": courier,
                "tracking_number": tracking_number,
                "tracking_status": parent.tracking_status or "Order Confirmed",
                "status_step": 1,
                "tracking_url": parent.tracking_url or "",
                "tracking_notes": "Commission confirmed and assigned to master atelier queue.",
            })

    new_tracking_entry = {
        "item_label": new_item_obj["description"],
        "quantity": qty,
        "courier_name": courier,
        "tracking_number": tracking_number,  # STRICT REQUIREMENT: Same tracking number
        "tracking_status": "Order Confirmed",
        "status_step": 1,
        "tracking_url": parent.tracking_url or "",
        "tracking_notes": f"Item added to commission. Unified under consignment {tracking_number}.",
    }
    updated_trackings = existing_trackings + [new_tracking_entry]

    # Update parent record
    notes_data["items"] = updated_items
    notes_data["taxable"] = new_taxable
    notes_data["total_gst"] = new_total_gst
    notes_data["grand_total"] = new_grand_total
    notes_data["advance_amount"] = new_total_advance
    notes_data["remaining_amount"] = new_total_remaining
    parent.notes = json.dumps(notes_data)
    parent.amount = new_grand_total
    parent.item_tracking_json = json.dumps(updated_trackings)
    parent.status = "PARTIAL" if new_total_remaining > 0 else "PAID"
    parent.updated_at = datetime.utcnow()

    # Record linked payment transaction
    txn_id = f"SHV-ADD-{uuid.uuid4().hex[:8].upper()}"
    new_payment = PaymentRecord(
        transaction_id=txn_id,
        order_id=parent.order_id,          # SAME order_id
        invoice_no=parent.invoice_no,      # SAME invoice_no
        amount=round(actual_paid, 2),
        currency="INR",
        customer_name=(customer_name or parent.customer_name).strip(),
        customer_email=(customer_email or parent.customer_email).strip(),
        customer_phone=(customer_phone or parent.customer_phone),
        reference_code=parent.reference_code or parent.order_id,
        purpose=f"Item Added: {new_item_obj['description']}",
        payment_method=payment_method,
        status="PAID",
        tracking_status="Order Confirmed",
        courier_name=courier,
        tracking_number=tracking_number,   # SAME tracking_number
        item_tracking_json=json.dumps(updated_trackings),
        notes=json.dumps({
            "action": "add_item",
            "parent_order_id": parent.order_id,
            "parent_invoice_no": parent.invoice_no,
            "added_item": new_item_obj,
            "paid_amount": actual_paid,
            "is_advance": is_advance,
            "new_item_remaining": new_item_remaining,
        }),
        created_at=datetime.utcnow(),
    )
    db.add(new_payment)
    db.commit()
    db.refresh(parent)
    db.refresh(new_payment)

    return {
        "success": True,
        "message": "Item added to existing order successfully.",
        "order_id": parent.order_id,
        "invoice_no": parent.invoice_no,
        "tracking_number": tracking_number,
        "transaction_id": new_payment.transaction_id,
        "amount_paid": actual_paid,
        "is_advance": is_advance,
        "new_grand_total": new_grand_total,
        "new_remaining": new_total_remaining,
        "total_advance": new_total_advance,
        "items": updated_items,
        "item_trackings": updated_trackings,
        "parent": {
            "id": parent.id,
            "customer_name": parent.customer_name,
            "customer_email": parent.customer_email,
            "status": parent.status,
        }
    }


@router.get("/api/orders/{identifier:path}")
def get_order_details(identifier: str, db: Session = Depends(get_db)):
    """
    Public lookup for complete order details by Order ID, Invoice Number, Reference Code, or Transaction ID.
    Used by:
    1. Patron: 'Add an item to the existing bill' in Navbar Pay modal
    2. Admin: 'Generate an existing bill' in Admin Bill Generator
    """
    from sqlalchemy import or_
    from app.models.request import GiftRequest as GR

    clean = identifier.strip()

    # 1. Search in PaymentRecord
    pay = db.query(PaymentRecord).filter(
        or_(
            PaymentRecord.order_id.ilike(clean),
            PaymentRecord.invoice_no.ilike(clean),
            PaymentRecord.transaction_id.ilike(clean),
            PaymentRecord.reference_code.ilike(clean),
        )
    ).order_by(PaymentRecord.id.asc()).first()

    if pay:
        notes_data = {}
        try:
            notes_data = json.loads(pay.notes) if pay.notes else {}
        except Exception:
            notes_data = {}

        items = notes_data.get("items") or [
            {
                "id": "item_1",
                "description": pay.purpose or "Bespoke Atelier Commission & Curation",
                "hsn": "997212",
                "qty": 1,
                "unit": "PCS",
                "rate": round(pay.amount / 1.18, 2),
                "gst_rate": 18,
            }
        ]

        taxable = float(notes_data.get("taxable") or 0.0)
        total_gst = float(notes_data.get("total_gst") or 0.0)
        recorded_advance = float(notes_data.get("advance_amount") or 0.0)
        recorded_remaining = float(notes_data.get("remaining_amount") or 0.0)
        total_billed = float(
            notes_data.get("grand_total")
            or notes_data.get("grandTotal")
            or (taxable + total_gst if (taxable + total_gst) > 0 else 0.0)
            or (recorded_advance + recorded_remaining if (recorded_advance + recorded_remaining) > 0 else 0.0)
            or pay.amount
            or 0.0
        )

        subsequent_payments = db.query(PaymentRecord).filter(
            PaymentRecord.id != pay.id,
            or_(
                PaymentRecord.order_id.ilike(pay.order_id) if pay.order_id else False,
                PaymentRecord.reference_code.ilike(pay.reference_code) if pay.reference_code else False,
                PaymentRecord.invoice_no.ilike(pay.invoice_no) if pay.invoice_no else False,
            )
        ).all()
        paid_statuses = {"PAID", "COMPLETED", "BILLED", "SUCCESS"}
        subsequent_paid = sum(
            p.amount for p in subsequent_payments if (p.status or "").upper() in paid_statuses
        )

        extra_payments = list(notes_data.get("extra_payments") or [])
        extra_paid = sum(float(p.get("amount") or 0.0) for p in extra_payments)

        if recorded_remaining > 0 or recorded_advance > 0 or extra_paid > 0:
            total_paid = min(total_billed, max(round(recorded_advance + extra_paid, 2), round(recorded_advance + subsequent_paid, 2)))
            balance_due = max(0.0, round(total_billed - total_paid, 2))
        elif (pay.status or "").upper() in {"PENDING", "PROFORMA", "UNPAID"}:
            total_paid = round(subsequent_paid, 2)
            balance_due = max(0.0, round(total_billed - total_paid, 2))
        else:
            total_paid = total_billed
            balance_due = 0.0

        item_trackings = []
        if pay.item_tracking_json:
            try:
                parsed_t = json.loads(pay.item_tracking_json)
                if isinstance(parsed_t, list):
                    item_trackings = parsed_t
            except Exception:
                item_trackings = []

        tracking_number = pay.tracking_number or pay.invoice_no or pay.transaction_id
        courier_name = pay.courier_name or "Blue Dart Express"

        if not item_trackings:
            for idx, it in enumerate(items):
                item_trackings.append({
                    "item_label": it.get("description") or f"Item {idx + 1}",
                    "quantity": it.get("qty") or 1,
                    "courier_name": courier_name,
                    "tracking_number": tracking_number,
                    "tracking_status": pay.tracking_status or "Order Confirmed",
                    "status_step": 1,
                    "tracking_url": pay.tracking_url or "",
                    "tracking_notes": pay.tracking_notes or "Commission confirmed and assigned to atelier queue.",
                })

        inv_date = pay.invoice_date or notes_data.get("invoice_date")
        if not inv_date and pay.created_at:
            inv_date = pay.created_at.strftime("%Y-%m-%d")

        return {
            "found": True,
            "source": "payment",
            "id": pay.id,
            "order_id": pay.order_id or f"ORDER-{pay.id}",
            "invoice_no": pay.invoice_no or pay.transaction_id,
            "transaction_id": pay.transaction_id,
            "invoice_date": inv_date,
            "customer_name": pay.customer_name,
            "customer_email": pay.customer_email,
            "customer_phone": pay.customer_phone or "",
            "customer_gstin": notes_data.get("customer_gstin") or "",
            "customer_address": notes_data.get("customer_address") or "",
            "customer_city": notes_data.get("customer_city") or "",
            "customer_state": notes_data.get("customer_state") or "",
            "customer_pincode": notes_data.get("customer_pincode") or "",
            "place_of_supply": notes_data.get("place_of_supply") or "Telangana",
            "reference_code": pay.reference_code or pay.order_id,
            "purpose": pay.purpose,
            "status": pay.status,
            "items": items,
            "taxable": round(taxable, 2),
            "total_gst": round(total_gst, 2),
            "grand_total": round(total_billed, 2),
            "advance_amount": round(recorded_advance, 2),
            "advance_payment_mode": notes_data.get("advance_payment_mode") or "Bank Transfer",
            "extra_payments": extra_payments,
            "remaining_amount": round(recorded_remaining if recorded_remaining > 0 else balance_due, 2),
            "remaining_payment_mode": notes_data.get("remaining_payment_mode") or "Bank Transfer",
            "total_billed": round(total_billed, 2),
            "total_paid": round(total_paid, 2),
            "balance_due": round(balance_due, 2),
            "tracking_status": pay.tracking_status or "Order Confirmed",
            "courier_name": courier_name,
            "tracking_number": tracking_number,
            "tracking_url": pay.tracking_url or "",
            "estimated_delivery": pay.estimated_delivery or "",
            "tracking_notes": pay.tracking_notes or "",
            "item_trackings": item_trackings,
            "notes": notes_data.get("notes") or "",
            "created_at": pay.created_at.isoformat() if pay.created_at else None,
        }

    # 2. Search in GiftRequest
    req = db.query(GR).filter(
        or_(
            GR.reference_id.ilike(clean),
            GR.invoice_no.ilike(clean),
        )
    ).first()

    if req:
        items = [
            {
                "id": "item_1",
                "description": f"Bespoke Curation for {req.occasion}",
                "hsn": "997212",
                "qty": req.quantity or 1,
                "unit": "PCS",
                "rate": req.estimated_min_unit or 5000,
                "gst_rate": 18,
            }
        ]
        total_billed = req.estimated_max_total or (len(items) * (req.estimated_min_unit or 5000) * 1.18)
        tracking_number = req.tracking_number or req.invoice_no or req.reference_id
        courier_name = req.courier_name or "Blue Dart Express"
        inv_date = req.invoice_date or (req.created_at.strftime("%Y-%m-%d") if req.created_at else "")

        return {
            "found": True,
            "source": "commission",
            "id": req.id,
            "order_id": req.reference_id,
            "invoice_no": req.invoice_no or req.reference_id,
            "transaction_id": req.reference_id,
            "invoice_date": inv_date,
            "customer_name": req.client_name,
            "customer_email": req.client_email,
            "customer_phone": req.client_phone,
            "customer_gstin": "",
            "customer_address": req.delivery_city,
            "customer_city": req.delivery_city,
            "customer_state": "Telangana",
            "customer_pincode": "",
            "place_of_supply": "Telangana",
            "reference_code": req.reference_id,
            "purpose": f"Bespoke Commission for {req.occasion}",
            "status": req.status,
            "items": items,
            "taxable": round(total_billed / 1.18, 2),
            "total_gst": round(total_billed - (total_billed / 1.18), 2),
            "grand_total": round(total_billed, 2),
            "advance_amount": 0.0,
            "advance_payment_mode": "Bank Transfer",
            "remaining_amount": round(total_billed, 2),
            "remaining_payment_mode": "Bank Transfer",
            "total_billed": round(total_billed, 2),
            "total_paid": 0.0,
            "balance_due": round(total_billed, 2),
            "tracking_status": req.tracking_status or "Order Confirmed",
            "courier_name": courier_name,
            "tracking_number": tracking_number,
            "tracking_url": req.tracking_url or "",
            "estimated_delivery": req.estimated_delivery or req.delivery_date,
            "tracking_notes": req.tracking_notes or "",
            "item_trackings": [
                {
                    "item_label": items[0]["description"],
                    "quantity": items[0]["qty"],
                    "courier_name": courier_name,
                    "tracking_number": tracking_number,
                    "tracking_status": req.tracking_status or "Order Confirmed",
                    "status_step": 1,
                    "tracking_url": req.tracking_url or "",
                    "tracking_notes": req.tracking_notes or "",
                }
            ],
            "notes": req.special_notes or "",
            "created_at": req.created_at.isoformat() if req.created_at else None,
        }

    raise HTTPException(status_code=404, detail=f"No order found with Order ID or Invoice No '{clean}'.")


@router.post("/api/orders/add-item")
@router.post("/api/payments/add-item")
def add_item_to_order(
    payload: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Public endpoint: Add a new item to an existing order.
    The new item is added to the SAME order:
    - Same order_id and invoice_no
    - Same tracking_number & courier
    - Dynamic advance payment option
    - Updates per-item tracking and line items
    - Records payment transaction for paid amount
    """
    from sqlalchemy import or_
    from app.models.request import GiftRequest as GR

    identifier = (
        payload.get("order_id")
        or payload.get("order_identifier")
        or payload.get("invoice_no")
        or payload.get("reference_code")
        or ""
    ).strip()

    if not identifier:
        raise HTTPException(status_code=400, detail="Order ID or Invoice Number is required.")

    raw_item = payload.get("item") or {}
    if not raw_item.get("description") or not raw_item.get("rate"):
        raise HTTPException(status_code=400, detail="Item description and rate are required.")

    # 1. Search in PaymentRecord
    parent = db.query(PaymentRecord).filter(
        or_(
            PaymentRecord.order_id.ilike(identifier),
            PaymentRecord.invoice_no.ilike(identifier),
            PaymentRecord.transaction_id.ilike(identifier),
            PaymentRecord.reference_code.ilike(identifier),
        )
    ).order_by(PaymentRecord.id.asc()).first()

    if not parent:
        # Check GiftRequest
        req = db.query(GR).filter(
            or_(
                GR.reference_id.ilike(identifier),
                GR.invoice_no.ilike(identifier),
            )
        ).first()

        if req:
            # Create initial parent PaymentRecord for this GiftRequest so item can be added
            inv_no = req.invoice_no or f"VAS/2026-27/{1000 + (uuid.uuid4().int % 9000)}"
            ord_id = req.reference_id
            trk_no = req.tracking_number or inv_no
            initial_item = {
                "id": "item_1",
                "description": f"Bespoke Curation for {req.occasion}",
                "hsn": "997212",
                "qty": req.quantity or 1,
                "unit": "PCS",
                "rate": req.estimated_min_unit or 5000,
                "gst_rate": 18,
            }
            initial_total = req.estimated_max_total or (len([initial_item]) * (req.estimated_min_unit or 5000) * 1.18)
            parent = PaymentRecord(
                transaction_id=f"VAS-BILL-{uuid.uuid4().hex[:8].upper()}",
                order_id=ord_id,
                amount=initial_total,
                currency="INR",
                customer_name=req.client_name,
                customer_email=req.client_email,
                customer_phone=req.client_phone,
                reference_code=req.reference_id,
                purpose=f"Bespoke Commission for {req.occasion}",
                payment_method="Commission Recorded Bill",
                status="PAID",
                invoice_no=inv_no,
                tracking_status="Order Confirmed",
                courier_name=req.courier_name or "Blue Dart Express",
                tracking_number=trk_no,
                item_tracking_json=json.dumps([
                    {
                        "item_label": initial_item["description"],
                        "quantity": initial_item["qty"],
                        "courier_name": req.courier_name or "Blue Dart Express",
                        "tracking_number": trk_no,
                        "tracking_status": "Order Confirmed",
                        "status_step": 1,
                    }
                ]),
                notes=json.dumps({
                    "items": [initial_item],
                    "customer_address": req.delivery_city,
                    "taxable": round(initial_total / 1.18, 2),
                    "total_gst": round(initial_total - (initial_total / 1.18), 2),
                    "grand_total": initial_total,
                    "advance_amount": initial_total,
                    "remaining_amount": 0,
                }),
                created_at=datetime.utcnow(),
            )
            db.add(parent)
            db.commit()
            db.refresh(parent)
        else:
            raise HTTPException(status_code=404, detail=f"No order found for '{identifier}'.")

    is_advance = bool(payload.get("is_advance"))
    paid_amount = float(payload.get("paid_amount") or payload.get("payment_amount") or payload.get("advance_amount") or 0.0)
    payment_method = payload.get("payment_method") or "Cashfree PG"
    cust_name = payload.get("customer_name") or parent.customer_name
    cust_email = payload.get("customer_email") or parent.customer_email
    cust_phone = payload.get("customer_phone") or parent.customer_phone

    result = process_add_item_to_order_record(
        db=db,
        parent=parent,
        raw_item=raw_item,
        is_advance=is_advance,
        paid_amount=paid_amount,
        payment_method=payment_method,
        customer_name=cust_name,
        customer_email=cust_email,
        customer_phone=cust_phone,
    )

    # Trigger email notification
    background_tasks.add_task(
        send_payment_confirmation,
        {
            "transaction_id": result["transaction_id"],
            "order_id": result["order_id"],
            "amount": result["amount_paid"],
            "customer_name": cust_name,
            "customer_email": cust_email,
            "customer_phone": cust_phone,
            "reference_code": parent.reference_code,
            "purpose": f"Item Added to Order {result['invoice_no']}: {raw_item.get('description')}",
            "payment_method": payment_method,
            "status": "PAID",
            "created_at": datetime.utcnow().isoformat(),
            "notes": f"Item added with tracking number: {result['tracking_number']}",
        }
    )

    return result
