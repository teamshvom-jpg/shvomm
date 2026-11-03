from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class PaymentCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Customer-entered payment amount in INR")
    customer_name: str = Field(..., min_length=2, max_length=255)
    customer_email: EmailStr
    customer_phone: Optional[str] = Field(None, max_length=64)
    reference_code: Optional[str] = Field(None, max_length=64)
    purpose: Optional[str] = Field("Commission Advance", max_length=128)
    payment_method: Optional[str] = Field("Cashfree PG", max_length=64)
    notes: Optional[str] = None


class CreateOrderRequest(BaseModel):
    order_amount: float = Field(..., description="Payment amount in INR (minimum 1.00)")
    customer_name: str = Field(..., min_length=2, max_length=255, description="Full name of customer")
    customer_email: EmailStr = Field(..., description="Valid email address of customer")
    customer_phone: Optional[str] = Field(None, max_length=64, description="Customer contact number")
    reference_code: Optional[str] = Field(None, max_length=64, description="Optional Shvom commission reference code")
    purpose: Optional[str] = Field("Commission Advance", max_length=128)
    return_url: Optional[str] = Field(None, description="Frontend URL for redirect target return")
    notes: Optional[str] = Field(None, description="Optional customer or commission notes")


class CreateOrderResponse(BaseModel):
    payment_session_id: str
    order_id: str


class VerifyPaymentRequest(BaseModel):
    order_id: str = Field(..., min_length=1, description="Cashfree order ID to verify")


class VerifyPaymentResponse(BaseModel):
    success: bool
    order_id: str
    payment_status: str
    amount: Optional[float] = None
    currency: Optional[str] = "INR"
    customer_name: Optional[str] = None
    transaction_id: Optional[str] = None
    cf_order_id: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    transaction_id: str
    order_id: Optional[str] = None
    cf_order_id: Optional[str] = None
    payment_session_id: Optional[str] = None
    amount: float
    currency: Optional[str] = "INR"
    customer_name: str
    customer_email: str
    customer_phone: Optional[str] = None
    reference_code: Optional[str] = None
    purpose: str
    payment_method: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
