"""
Cashfree Payments Service — Secure Integration for Cashfree Standard Web Checkout.

Handles:
- Creating payment sessions via Cashfree PG Orders API (v2025-01-01)
- Fetching and verifying order payment status server-side
- Verifying Cashfree webhook signatures using HMAC-SHA256
"""

import os
import re
import uuid
import hmac
import hashlib
import base64
import logging
from typing import Dict, Any, Optional, Tuple
import httpx
from fastapi import HTTPException

logger = logging.getLogger("cashfree_service")

# Cashfree API Constants
SANDBOX_API_URL = "https://sandbox.cashfree.com/pg"
PRODUCTION_API_URL = "https://api.cashfree.com/pg"
CASHFREE_API_VERSION = "2025-01-01"
MINIMUM_ORDER_AMOUNT_INR = 1.00


def get_cashfree_env() -> str:
    """Returns the current Cashfree environment mode (SANDBOX or PRODUCTION)."""
    return os.getenv("CASHFREE_ENVIRONMENT", "SANDBOX").strip().upper()


def get_base_url() -> str:
    """Determines the appropriate Cashfree API endpoint based on environment."""
    return PRODUCTION_API_URL if get_cashfree_env() == "PRODUCTION" else SANDBOX_API_URL


def get_credentials() -> Tuple[str, str]:
    """
    Safely retrieves Cashfree API credentials from environment.
    Never exposes secrets in logs or responses.
    """
    client_id = os.getenv("CASHFREE_CLIENT_ID", "").strip()
    client_secret = os.getenv("CASHFREE_CLIENT_SECRET", "").strip()
    return client_id, client_secret


def is_credentials_configured() -> bool:
    """Checks if real Cashfree credentials have been supplied."""
    cid, sec = get_credentials()
    if not cid or not sec:
        return False
    if "<YOUR_CASHFREE" in cid or "<YOUR_CASHFREE" in sec:
        return False
    return True


def sanitize_phone_number(raw_phone: Optional[str]) -> str:
    """
    Sanitizes phone numbers to standard 10-digit format required by Cashfree.
    Defaults to compliant fallback if none provided.
    """
    if not raw_phone:
        return "9876543210"
    digits = re.sub(r"\D", "", raw_phone)
    if len(digits) > 10 and digits.startswith("91"):
        digits = digits[2:]
    if len(digits) >= 10:
        return digits[-10:]
    return digits.ljust(10, "0")


async def create_cashfree_order_session(
    order_amount: float,
    customer_name: str,
    customer_email: str,
    customer_phone: Optional[str] = None,
    order_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    return_url: Optional[str] = None,
) -> Dict[str, str]:
    """
    Creates a new Cashfree payment order session.
    
    Returns:
        {
            "payment_session_id": "<Cashfree payment session ID>",
            "order_id": "<unique order ID>"
        }
    """
    # 1. Validate order amount
    if order_amount < MINIMUM_ORDER_AMOUNT_INR:
        raise HTTPException(
            status_code=400,
            detail=f"Order amount must be at least ₹{MINIMUM_ORDER_AMOUNT_INR:.2f} INR."
        )

    # 2. Check credentials
    client_id, client_secret = get_credentials()
    if not is_credentials_configured():
        logger.error("Cashfree credentials missing or unconfigured placeholder.")
        raise HTTPException(
            status_code=401,
            detail="Cashfree API credentials are not configured. Please specify CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET in backend/.env."
        )

    # 3. Generate IDs if not provided
    generated_order_id = order_id or f"order_shv_{uuid.uuid4().hex[:14]}"
    generated_customer_id = customer_id or f"cust_{uuid.uuid4().hex[:12]}"
    phone = sanitize_phone_number(customer_phone)

    # 4. Prepare Cashfree request payload
    base_url = get_base_url()
    url = f"{base_url}/orders"
    idempotency_key = str(uuid.uuid4())

    headers = {
        "x-client-id": client_id,
        "x-client-secret": client_secret,
        "x-api-version": CASHFREE_API_VERSION,
        "Content-Type": "application/json",
        "x-idempotency-key": idempotency_key,
    }

    body = {
        "order_id": generated_order_id,
        "order_amount": round(float(order_amount), 2),
        "order_currency": "INR",
        "customer_details": {
            "customer_id": generated_customer_id,
            "customer_name": customer_name.strip(),
            "customer_email": customer_email.strip(),
            "customer_phone": phone
        },
        "order_meta": {
            "return_url": return_url or f"http://localhost:5173/?order_id={generated_order_id}"
        }
    }

    # 5. Invoke Cashfree Payments API
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, headers=headers, json=body)
    except httpx.TimeoutException:
        logger.error("Cashfree order creation timed out.")
        raise HTTPException(
            status_code=504,
            detail="Cashfree payment gateway request timed out. Please try again."
        )
    except Exception as exc:
        logger.error(f"Cashfree connection exception: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Failed to connect to Cashfree payment gateway."
        )

    # 6. Parse response & handle status codes
    try:
        res_data = response.json()
    except Exception:
        res_data = {}

    if response.status_code == 200 or response.status_code == 201:
        payment_session_id = res_data.get("payment_session_id")
        returned_order_id = res_data.get("order_id", generated_order_id)
        if not payment_session_id:
            logger.error(f"Cashfree response missing payment_session_id: {res_data}")
            raise HTTPException(
                status_code=500,
                detail="Cashfree gateway did not return a valid payment session ID."
            )
        return {
            "payment_session_id": payment_session_id,
            "order_id": returned_order_id
        }

    # Handle Cashfree error codes without exposing secrets
    err_message = res_data.get("message") or res_data.get("error") or "Unknown error"
    logger.error(f"Cashfree create order error [{response.status_code}]: {err_message}")

    if response.status_code == 400:
        raise HTTPException(
            status_code=400,
            detail=f"Cashfree order validation error: {err_message}"
        )
    elif response.status_code == 401:
        raise HTTPException(
            status_code=401,
            detail="Cashfree authentication failed. Please verify your client ID and secret."
        )
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Cashfree payment gateway error: {err_message}"
        )


async def fetch_cashfree_order_status(order_id: str) -> Dict[str, Any]:
    """
    Fetches the latest order state directly from Cashfree's server-side API:
    GET /pg/orders/{order_id}
    """
    if not order_id or not order_id.strip():
        raise HTTPException(status_code=400, detail="order_id parameter is required.")

    client_id, client_secret = get_credentials()
    if not is_credentials_configured():
        logger.error("Cashfree credentials missing or unconfigured placeholder.")
        raise HTTPException(
            status_code=401,
            detail="Cashfree API credentials are not configured. Please check backend/.env."
        )

    base_url = get_base_url()
    url = f"{base_url}/orders/{order_id.strip()}"

    headers = {
        "x-client-id": client_id,
        "x-client-secret": client_secret,
        "x-api-version": CASHFREE_API_VERSION,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, headers=headers)
    except httpx.TimeoutException:
        logger.error(f"Cashfree verification timed out for order '{order_id}'.")
        raise HTTPException(
            status_code=504,
            detail="Cashfree verification request timed out."
        )
    except Exception as exc:
        logger.error(f"Cashfree connection exception during order verification: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Failed to connect to Cashfree payment gateway."
        )

    try:
        data = response.json()
    except Exception:
        data = {}

    if response.status_code == 200:
        return data

    err_msg = data.get("message") or "Unknown error"
    logger.error(f"Cashfree fetch order [{response.status_code}]: {err_msg}")

    if response.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail=f"Order '{order_id}' not found on Cashfree gateway."
        )
    elif response.status_code == 401:
        raise HTTPException(
            status_code=401,
            detail="Cashfree authentication failed. Please verify credentials."
        )
    elif response.status_code == 400:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid order request: {err_msg}"
        )
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Cashfree gateway error: {err_msg}"
        )


def verify_cashfree_webhook_signature(
    raw_body: bytes,
    signature: Optional[str],
    timestamp: Optional[str]
) -> bool:
    """
    Verifies Cashfree webhook signature using HMAC-SHA256:
    Base64(HMAC-SHA256(secret, timestamp + raw_body))
    """
    if not signature or not timestamp or not raw_body:
        return False

    client_id, client_secret = get_credentials()
    if not client_secret:
        return False

    try:
        # Cashfree signature = base64(hmac_sha256(secret, timestamp + raw_body))
        signed_data = timestamp.encode("utf-8") + raw_body
        digest = hmac.new(
            client_secret.encode("utf-8"),
            signed_data,
            hashlib.sha256
        ).digest()
        computed_signature = base64.b64encode(digest).decode("utf-8")
        return hmac.compare_digest(computed_signature.strip(), signature.strip())
    except Exception as exc:
        logger.error(f"Error computing webhook signature: {exc}")
        return False
