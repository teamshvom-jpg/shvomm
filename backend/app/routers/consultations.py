from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.consultation import ConsultationBooking
from app.schemas.consultation import ConsultationCreate, ConsultationResponse
from app.services.mailer import (
    notify_team_new_consultation,
    send_consultation_client_confirmation
)

router = APIRouter(prefix="/api/consultations", tags=["consultations"])


@router.post("", response_model=ConsultationResponse, status_code=201)
def book_consultation(
    payload: ConsultationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Submits a consultation booking for atelier visit or virtual curation session.
    """
    booking = ConsultationBooking(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        inquiry_type=payload.inquiry_type,
        preferred_date=payload.preferred_date,
        preferred_time_slot=payload.preferred_time_slot,
        notes=payload.notes,
        status="Pending"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    booking_dict = {
        "full_name": booking.full_name,
        "email": booking.email,
        "phone": booking.phone,
        "inquiry_type": booking.inquiry_type,
        "preferred_date": booking.preferred_date,
        "preferred_time_slot": booking.preferred_time_slot,
        "notes": booking.notes,
    }

    import os
    import logging
    c_logger = logging.getLogger("shvom.consultations")
    c_logger.info(f"[CONSULTATION ROUTE] New booking from '{booking.full_name}' ({booking.email}). Queueing notifications...")

    if os.environ.get("VERCEL") or os.environ.get("SYNC_MAILS"):
        try:
            notify_team_new_consultation(booking_dict)
            send_consultation_client_confirmation(booking_dict)
        except Exception as e:
            c_logger.error(f"[CONSULTATION ROUTE ERROR] Failed to send sync emails: {e}")
    else:
        background_tasks.add_task(notify_team_new_consultation, booking_dict)
        background_tasks.add_task(send_consultation_client_confirmation, booking_dict)

    return booking
