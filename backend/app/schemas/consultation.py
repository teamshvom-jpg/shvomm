from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class ConsultationCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    phone: str = Field(..., min_length=5, max_length=64)
    inquiry_type: str = Field(..., description="Corporate / Wedding / Atelier Visit / Private")
    preferred_date: Optional[str] = None
    preferred_time_slot: Optional[str] = None
    notes: Optional[str] = None


class ConsultationResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str
    inquiry_type: str
    preferred_date: Optional[str] = None
    preferred_time_slot: Optional[str] = None
    notes: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
