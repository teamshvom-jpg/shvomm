import os
import sys
import json
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Ensure the backend directory is on sys.path so `app.*` imports always resolve,
# whether started via `uvicorn app.main:app --app-dir backend` (local) or
# `uvicorn main:app` from inside the backend directory (Render/Docker).
_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

# Load environment configuration
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine, Base, SessionLocal, migrate_db_schema, get_db
from app.models.admin_user import AdminUser
from app.models.request import GiftRequest
from app.models.consultation import ConsultationBooking
from app.services.auth import get_password_hash
from app.routers import questions, estimate, uploads, requests, consultations, admin, payments

# Ensure static directories exist
STATIC_DIR = "/tmp/static" if os.environ.get("VERCEL") else os.path.join(os.path.dirname(__file__), "static")
UPLOADS_DIR = os.path.join(STATIC_DIR, "uploads")
try:
    os.makedirs(UPLOADS_DIR, exist_ok=True)
except OSError:
    pass


def seed_database():
    """Seeds initial admin concierge credentials."""
    db = SessionLocal()
    try:
        # 1. Admin concierge account
        admin_user = db.query(AdminUser).filter(AdminUser.username == "concierge").first()
        if not admin_user:
            admin_user = AdminUser(
                username="concierge",
                hashed_password=get_password_hash("ShvomAtelier2026!"),
                full_name="Shvom Head Concierge",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
    finally:
        db.close()


# Ensure tables, columns and seeds are ready upon import as well as lifespan
Base.metadata.create_all(bind=engine)
migrate_db_schema()
seed_database()

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    migrate_db_schema()
    seed_database()
    yield


app = FastAPI(
    title="Shvom Bespoke Gifting API",
    description="Quiet-luxury return-gifting platform backend for corporate galas and bespoke weddings.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
custom_origins = os.getenv("CORS_ORIGINS", "")
if custom_origins:
    origins = [o.strip() for o in custom_origins.split(",") if o.strip()]
    for d in default_origins:
        if d not in origins:
            origins.append(d)
else:
    origins = default_origins + ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Mount Routers
app.include_router(questions.router)
app.include_router(estimate.router)
app.include_router(uploads.router)
app.include_router(requests.router)
app.include_router(consultations.router)
app.include_router(admin.router)
app.include_router(payments.router)


@app.api_route("/", methods=["GET", "HEAD"])
def root_check():
    return {
        "status": "healthy",
        "service": "Shvom Bespoke Gifting API",
        "version": "1.0.0"
    }


@app.api_route("/health", methods=["GET", "HEAD"])
def simple_health_check():
    return {"status": "healthy"}


@app.get("/api/track/{identifier:path}")
def track_order_direct(identifier: str, db: SessionLocal = Depends(get_db)):
    from app.routers.requests import track_order_public
    return track_order_public(identifier, db)


@app.api_route("/api/health", methods=["GET", "HEAD"])
def health_check():
    from app.services.mailer import get_mail_config
    cfg = get_mail_config()
    return {
        "status": "healthy",
        "brand": "Shvom",
        "tagline": "The Art of the Thoughtful Departure",
        "service": "Bespoke Gifting Studio Engine",
        "email_delivery": {
            "team_email": cfg["team_email"],
            "smtp_configured": bool(cfg["smtp_host"] and cfg["smtp_user"] and cfg["smtp_password"]),
            "smtp_host": cfg["smtp_host"],
            "smtp_port": cfg["smtp_port"],
            "resend_configured": bool(cfg["resend_api_key"]),
            "brevo_configured": bool(cfg["brevo_api_key"]),
            "is_serverless": bool(os.environ.get("VERCEL"))
        }
    }
