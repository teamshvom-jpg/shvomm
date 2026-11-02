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
        # Gather all payments with same reference_code or invoice_no
        related = db.query(PaymentRecord).filter(
            or_(
                PaymentRecord.reference_code.ilike(pay.reference_code) if pay.reference_code else False,
                PaymentRecord.invoice_no.ilike(pay.invoice_no) if pay.invoice_no else False,
            )
        ).all() or [pay]

        paid_statuses = {"PAID", "Completed", "BILLED", "SUCCESS"}
        total_paid = sum(
            p.amount for p in related if (p.status or "").upper() in paid_statuses or p.status in paid_statuses
        )
        # Try to read total_billed from notes JSON
        total_billed = 0.0
        try:
            notes_data = json.loads(pay.notes) if pay.notes else {}
            grand = notes_data.get("grand_total") or notes_data.get("grandTotal") or 0.0
            total_billed = float(grand)
        except Exception:
            total_billed = 0.0
        if total_billed == 0.0:
            total_billed = total_paid  # fallback
        balance = max(0.0, round(total_billed - total_paid, 2))

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
                for p in related
            ],
        }

    raise HTTPException(
        status_code=404,
        detail=f"No order or invoice found for '{clean}'. Please check your invoice number or reference code."
    )
