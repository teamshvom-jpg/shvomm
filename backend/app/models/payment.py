from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from app.database import Base


class PaymentRecord(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(64), unique=True, index=True, nullable=False)
    order_id = Column(String(64), unique=True, index=True, nullable=True)
    cf_order_id = Column(String(64), nullable=True)
    payment_session_id = Column(String(255), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    customer_name = Column(String(255), nullable=False)
    customer_email = Column(String(255), nullable=False)
    customer_phone = Column(String(64), nullable=True)
    reference_code = Column(String(64), nullable=True)
    purpose = Column(String(128), default="Commission Advance")
    payment_method = Column(String(64), default="Cashfree PG")
    status = Column(String(32), default="PENDING")
    
    # Fulfillment & Tracking
    invoice_no = Column(String(64), nullable=True, index=True)
    tracking_status = Column(String(64), default="Payment Verified", nullable=True)
    courier_name = Column(String(128), nullable=True)
    tracking_number = Column(String(128), nullable=True)
    tracking_url = Column(String(512), nullable=True)
    estimated_delivery = Column(String(64), nullable=True)
    tracking_notes = Column(Text, nullable=True)

    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
