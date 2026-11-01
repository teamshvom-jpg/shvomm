import hmac
import hashlib
import base64
import time
import json
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models.payment import PaymentRecord

client = TestClient(app)


@pytest.fixture(autouse=True)
def cleanup_payments():
    """Clean up test payment records after tests."""
    yield
    db = SessionLocal()
    try:
        db.query(PaymentRecord).filter(
            (PaymentRecord.order_id.like("order_test_%")) |
            (PaymentRecord.customer_email == "test.concierge@shvom.com")
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


def test_create_order_validation_minimum_amount():
    """Verify that order_amount below 1.00 INR is rejected with 400."""
    payload = {
        "order_amount": 0.50,
        "customer_name": "Meera Singhania",
        "customer_email": "test.concierge@shvom.com"
    }
    res = client.post("/api/create-order", json=payload)
    assert res.status_code == 400
    assert "at least ₹1.00 INR" in res.json()["detail"]


def test_create_order_validation_invalid_email():
    """Verify that invalid customer_email is rejected with 422."""
    payload = {
        "order_amount": 1500.0,
        "customer_name": "Meera Singhania",
        "customer_email": "not-an-email"
    }
    res = client.post("/api/create-order", json=payload)
    assert res.status_code == 422


def test_create_order_unconfigured_credentials():
    """Verify that placeholder credentials return 401 informing the developer."""
    payload = {
        "order_amount": 2500.0,
        "customer_name": "Meera Singhania",
        "customer_email": "test.concierge@shvom.com"
    }
    with patch("app.services.cashfree.is_credentials_configured", return_value=False):
        res = client.post("/api/create-order", json=payload)
        assert res.status_code == 401
        assert "Cashfree API credentials are not configured" in res.json()["detail"]


def test_create_order_success_with_mock():
    """Verify successful order creation session and database record persistence."""
    payload = {
        "order_amount": 5000.0,
        "customer_name": "Alisha Mehta",
        "customer_email": "test.concierge@shvom.com",
        "customer_phone": "+91 98112 98765",
        "reference_code": "SHV-2026-TEST",
        "purpose": "Commission Advance",
        "notes": "Testing Cashfree checkout order creation"
    }

    mock_cashfree_res = {
        "payment_session_id": "session_test_mock_12345",
        "order_id": "order_test_mock_001"
    }

    with patch("app.services.cashfree.is_credentials_configured", return_value=True), \
         patch("app.routers.payments.create_cashfree_order_session", return_value=mock_cashfree_res):
        res = client.post("/api/create-order", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["payment_session_id"] == "session_test_mock_12345"
        assert data["order_id"] == "order_test_mock_001"

    # Verify order is saved in DB with PENDING status
    db = SessionLocal()
    try:
        record = db.query(PaymentRecord).filter(
            PaymentRecord.order_id == "order_test_mock_001"
        ).first()
        assert record is not None
        assert record.amount == 5000.0
        assert record.currency == "INR"
        assert record.status == "PENDING"
        assert record.customer_name == "Alisha Mehta"
        assert record.reference_code == "SHV-2026-TEST"
    finally:
        db.close()


def test_verify_payment_success():
    """Verify server-side payment verification confirming 'PAID' order status."""
    # Seed a pending payment in DB
    db = SessionLocal()
    try:
        record = PaymentRecord(
            transaction_id="SHV-PAY-TEST-002",
            order_id="order_test_verify_002",
            payment_session_id="session_test_002",
            amount=3500.0,
            currency="INR",
            customer_name="Vikramaditya Oberoi",
            customer_email="test.concierge@shvom.com",
            customer_phone="9820099887",
            status="PENDING"
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    mock_cf_order = {
        "order_id": "order_test_verify_002",
        "order_status": "PAID",
        "order_amount": 3500.0,
        "order_currency": "INR",
        "cf_order_id": "cf_1029384756",
        "customer_details": {
            "customer_name": "Vikramaditya Oberoi",
            "customer_email": "test.concierge@shvom.com",
            "customer_phone": "9820099887"
        }
    }

    with patch("app.routers.payments.fetch_cashfree_order_status", return_value=mock_cf_order):
        res = client.post("/api/verify-payment", json={"order_id": "order_test_verify_002"})
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["order_id"] == "order_test_verify_002"
        assert data["payment_status"] == "PAID"
        assert data["amount"] == 3500.0

    # Confirm database record status is updated to PAID
    db = SessionLocal()
    try:
        updated = db.query(PaymentRecord).filter(
            PaymentRecord.order_id == "order_test_verify_002"
        ).first()
        assert updated.status == "PAID"
        assert updated.cf_order_id == "cf_1029384756"
    finally:
        db.close()


def test_verify_payment_unpaid_rejection():
    """Verify that an unpaid/active order is rejected and not marked as paid."""
    db = SessionLocal()
    try:
        record = PaymentRecord(
            transaction_id="SHV-PAY-TEST-003",
            order_id="order_test_unpaid_003",
            payment_session_id="session_test_003",
            amount=4000.0,
            currency="INR",
            customer_name="Rohan Merchant",
            customer_email="test.concierge@shvom.com",
            status="PENDING"
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    mock_cf_order = {
        "order_id": "order_test_unpaid_003",
        "order_status": "ACTIVE",
        "order_amount": 4000.0,
        "order_currency": "INR",
        "cf_order_id": "cf_unpaid_123"
    }

    with patch("app.routers.payments.fetch_cashfree_order_status", return_value=mock_cf_order):
        res = client.post("/api/verify-payment", json={"order_id": "order_test_unpaid_003"})
        assert res.status_code == 400
        assert "has not been completed" in res.json()["detail"]

    # Verify DB record is not marked PAID
    db = SessionLocal()
    try:
        rec = db.query(PaymentRecord).filter(
            PaymentRecord.order_id == "order_test_unpaid_003"
        ).first()
        assert rec.status != "PAID"
    finally:
        db.close()


def test_verify_payment_amount_mismatch():
    """Verify that an order amount mismatch between DB and Cashfree is rejected."""
    db = SessionLocal()
    try:
        record = PaymentRecord(
            transaction_id="SHV-PAY-TEST-004",
            order_id="order_test_mismatch_004",
            payment_session_id="session_test_004",
            amount=5000.0,
            currency="INR",
            customer_name="Tara Singhania",
            customer_email="test.concierge@shvom.com",
            status="PENDING"
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    mock_cf_order = {
        "order_id": "order_test_mismatch_004",
        "order_status": "PAID",
        "order_amount": 1000.0,  # Mismatched amount
        "order_currency": "INR",
        "cf_order_id": "cf_mismatch_456"
    }

    with patch("app.routers.payments.fetch_cashfree_order_status", return_value=mock_cf_order):
        res = client.post("/api/verify-payment", json={"order_id": "order_test_mismatch_004"})
        assert res.status_code == 400
        assert "Payment amount mismatch" in res.json()["detail"]


def test_webhook_invalid_signature():
    """Verify that webhook calls with invalid signatures are rejected."""
    payload = {"data": {"order": {"order_id": "order_test_webhook_001"}}}
    res = client.post(
        "/api/webhooks/cashfree",
        json=payload,
        headers={
            "x-webhook-signature": "invalid_signature",
            "x-webhook-timestamp": str(int(time.time()))
        }
    )
    assert res.status_code == 400
    assert "Invalid webhook signature" in res.json()["detail"]


def test_webhook_valid_signature_and_idempotency():
    """Verify webhook processing with valid HMAC signature and duplicate idempotency."""
    test_secret = "test_secret_for_webhook_signature"
    timestamp = str(int(time.time()))
    order_id = "order_test_webhook_005"

    db = SessionLocal()
    try:
        record = PaymentRecord(
            transaction_id="SHV-PAY-TEST-005",
            order_id=order_id,
            amount=7500.0,
            currency="INR",
            customer_name="Devika Merchant",
            customer_email="test.concierge@shvom.com",
            status="PENDING"
        )
        db.add(record)
        db.commit()
    finally:
        db.close()

    webhook_payload = {
        "type": "PAYMENT_SUCCESS_WEBHOOK",
        "data": {
            "order": {
                "order_id": order_id,
                "order_amount": 7500.0,
                "order_currency": "INR"
            },
            "payment": {
                "cf_payment_id": "cf_payment_987654",
                "payment_status": "SUCCESS",
                "payment_amount": 7500.0,
                "payment_currency": "INR"
            }
        }
    }
    raw_body = json.dumps(webhook_payload).encode("utf-8")

    # Compute valid signature: base64(hmac_sha256(secret, timestamp + raw_body))
    digest = hmac.new(
        test_secret.encode("utf-8"),
        timestamp.encode("utf-8") + raw_body,
        hashlib.sha256
    ).digest()
    valid_signature = base64.b64encode(digest).decode("utf-8")

    with patch("app.services.cashfree.get_credentials", return_value=("test_client_id", test_secret)):
        # First delivery -> status updated to PAID
        res1 = client.post(
            "/api/webhooks/cashfree",
            content=raw_body,
            headers={
                "Content-Type": "application/json",
                "x-webhook-signature": valid_signature,
                "x-webhook-timestamp": timestamp
            }
        )
        assert res1.status_code == 200
        assert res1.json()["status"] == "success"

        # Duplicate delivery -> idempotent return
        res2 = client.post(
            "/api/webhooks/cashfree",
            content=raw_body,
            headers={
                "Content-Type": "application/json",
                "x-webhook-signature": valid_signature,
                "x-webhook-timestamp": timestamp
            }
        )
        assert res2.status_code == 200
        assert res2.json()["status"] == "already_processed"

    # Verify DB record is marked PAID
    db = SessionLocal()
    try:
        updated = db.query(PaymentRecord).filter(
            PaymentRecord.order_id == order_id
        ).first()
        assert updated.status == "PAID"
        assert updated.cf_order_id == "cf_payment_987654"
    finally:
        db.close()
