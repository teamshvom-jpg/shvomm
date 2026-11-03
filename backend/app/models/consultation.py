from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.database import Base


class ConsultationBooking(Base):
    __tablename__ = "consultation_bookings"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(64), nullable=False)
    inquiry_type = Column(String(64), nullable=False)  # Corporate / Wedding / Atelier Visit / Private
    preferred_date = Column(String(64), nullable=True)
    preferred_time_slot = Column(String(64), nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String(32), default="Pending")  # Pending, Scheduled, Completed, Cancelled
    created_at = Column(DateTime, default=datetime.utcnow)
