from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class EstimateRequest(BaseModel):
    category: str = Field(..., description="Key from CATEGORY_BASE_RANGES, e.g. edible, fragrance")
    packaging: Optional[str] = Field("linen_keepsake_box", description="Key from PACKAGING_MULTIPLIERS")
    personalization: Optional[str] = Field("custom_card", description="Key from PERSONALIZATION_MULTIPLIERS")
    quantity: int = Field(50, ge=1, le=10000)
    budget_per_gift: Optional[float] = None


class EstimateResponse(BaseModel):
    min_unit: float
    max_unit: float
    min_total: float
    max_total: float
    quantity: int
    discount_label: str
    discount_factor: float
    category_name: str
    currency: str = "INR"
    currency_symbol: str = "₹"


class GiftRequestCreate(BaseModel):
    occasion: str = Field(..., min_length=2, max_length=64)
    client_name: str = Field(..., min_length=2, max_length=255)
    client_email: EmailStr
    client_phone: str = Field(..., min_length=5, max_length=64)
    delivery_city: str = Field(..., min_length=2, max_length=128)
    delivery_date: str = Field(..., min_length=2, max_length=64)
    quantity: int = Field(50, ge=1, le=10000)
    budget_per_gift: Optional[float] = 3500.0
    answers: Dict[str, Any] = Field(default_factory=dict)
    logo_url: Optional[str] = None
    reference_image_url: Optional[str] = None
    special_notes: Optional[str] = None


class GiftRequestStatusUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(New|Contacted|Quoted|Confirmed|Closed)$")
    admin_notes: Optional[str] = None


class TrackingUpdate(BaseModel):
    invoice_no: Optional[str] = None
    tracking_status: Optional[str] = None
    courier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    estimated_delivery: Optional[str] = None
    tracking_notes: Optional[str] = None


class TrackingResponse(BaseModel):
    found: bool
    invoice_no: Optional[str] = None
    reference_id: Optional[str] = None
    client_name: str
    client_email: Optional[str] = None
    occasion: Optional[str] = None
    destination: Optional[str] = None
    quantity: Optional[int] = None
    tracking_status: str
    status_step: int
    courier_name: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_url: Optional[str] = None
    estimated_delivery: Optional[str] = None
    tracking_notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class GiftRequestResponse(BaseModel):
    id: int
    reference_id: str
    occasion: str
    client_name: str
    client_email: str
    client_phone: str
    delivery_city: str
    delivery_date: str
    quantity: int
    budget_per_gift: float
    estimated_min_unit: float
    estimated_max_unit: float
    estimated_min_total: float
    estimated_max_total: float
    status: str
    answers: Dict[str, Any]
    logo_url: Optional[str] = None
    reference_image_url: Optional[str] = None
    special_notes: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
