from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime
from app.database import Base


class GiftRequest(Base):
    __tablename__ = "gift_requests"

    id = Column(Integer, primary_key=True, index=True)
    reference_id = Column(String(32), unique=True, index=True, nullable=False)
    occasion = Column(String(64), nullable=False)
    
    # Client Contact
    client_name = Column(String(255), nullable=False)
    client_email = Column(String(255), nullable=False, index=True)
    client_phone = Column(String(64), nullable=False)
    delivery_city = Column(String(128), nullable=False)
    delivery_date = Column(String(64), nullable=False)

    # Core Parameters
    quantity = Column(Integer, default=50)
    budget_per_gift = Column(Float, default=3500.0)
    
    # Rule-based estimated ranges
    estimated_min_unit = Column(Float, default=0.0)
    estimated_max_unit = Column(Float, default=0.0)
    estimated_min_total = Column(Float, default=0.0)
    estimated_max_total = Column(Float, default=0.0)

    # Status tracking: New, Contacted, Quoted, Confirmed, Closed
    status = Column(String(32), default="New", index=True)
    
    # Full designer state in JSON
    answers_json = Column(Text, nullable=False)
    
    # Uploaded assets
    logo_url = Column(String(512), nullable=True)
    reference_image_url = Column(String(512), nullable=True)
    
    # Fulfillment & Tracking
    invoice_no = Column(String(64), nullable=True, index=True)
    invoice_date = Column(String(32), nullable=True)
    tracking_status = Column(String(64), default="Order Confirmed", nullable=True)
    courier_name = Column(String(128), nullable=True)
    tracking_number = Column(String(128), nullable=True)
    tracking_url = Column(String(512), nullable=True)
    estimated_delivery = Column(String(64), nullable=True)
    tracking_notes = Column(Text, nullable=True)

    # Per-item tracking (JSON array of {item_label, courier_name, tracking_number, tracking_url})
    item_tracking_json = Column(Text, nullable=True)

    # Notes
    special_notes = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
