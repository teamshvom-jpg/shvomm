"""
Migrate all data from local SQLite (shvom.db) to Neon.tech PostgreSQL.

Usage:
    python backend/migrate_to_postgres.py [POSTGRES_DATABASE_URL]
Or set DATABASE_URL in backend/.env before running.
"""

import os
import sys
import sqlite3
from dotenv import load_dotenv

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from sqlalchemy import create_engine
from app.database import Base
from app.models.admin_user import AdminUser
from app.models.request import GiftRequest
from app.models.payment import PaymentRecord
from app.models.consultation import ConsultationBooking


def run_migration(pg_url: str = None):
    target_url = pg_url or os.getenv("DATABASE_URL")
    if not target_url or "sqlite" in target_url:
        print("[ERROR] No PostgreSQL URL provided.")
        print("Please pass your Neon connection string, e.g.:")
        print("  python backend/migrate_to_postgres.py 'postgresql://user:pass@ep-xxxx.neon.tech/neondb?sslmode=require'")
        return False

    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql://", 1)

    sqlite_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shvom.db")
    if not os.path.exists(sqlite_path):
        # Fallback to root shvom.db
        sqlite_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "shvom.db")

    print(f"[*] Source SQLite: {sqlite_path}")
    print(f"[*] Target Postgres: {target_url.split('@')[-1] if '@' in target_url else target_url}")

    # 1. Connect to Postgres and create tables
    print("[*] Creating Postgres tables...")
    pg_engine = create_engine(target_url, pool_pre_ping=True)
    Base.metadata.create_all(bind=pg_engine)
    print("[OK] Tables initialized in Postgres.")

    # 2. Connect to SQLite
    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row
    s_cur = sqlite_conn.cursor()

    # 3. Migrate tables
    from sqlalchemy.orm import sessionmaker
    PgSession = sessionmaker(bind=pg_engine)
    pg_db = PgSession()

    try:
        # A. Admin Users
        s_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_users'")
        if s_cur.fetchone():
            s_cur.execute("SELECT * FROM admin_users")
            rows = s_cur.fetchall()
            print(f"[*] Migrating {len(rows)} admin user(s)...")
            for r in rows:
                existing = pg_db.query(AdminUser).filter(AdminUser.username == r["username"]).first()
                if not existing:
                    u = AdminUser(
                        username=r["username"],
                        hashed_password=r["hashed_password"],
                        full_name=r["full_name"],
                        is_active=bool(r["is_active"])
                    )
                    pg_db.add(u)
            pg_db.commit()

        # B. Payments
        s_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='payments'")
        if s_cur.fetchone():
            s_cur.execute("SELECT * FROM payments")
            rows = s_cur.fetchall()
            print(f"[*] Migrating {len(rows)} payment record(s)...")
            for r in rows:
                r_dict = dict(r)
                # Check if payment already in pg by transaction_id or order_id
                tx_id = r_dict.get("transaction_id")
                ord_id = r_dict.get("order_id")
                existing = None
                if tx_id:
                    existing = pg_db.query(PaymentRecord).filter(PaymentRecord.transaction_id == tx_id).first()
                if not existing and ord_id:
                    existing = pg_db.query(PaymentRecord).filter(PaymentRecord.order_id == ord_id).first()
                
                if not existing:
                    # Clean dictionary to only model columns
                    col_names = {c.name for c in PaymentRecord.__table__.columns}
                    filtered = {k: v for k, v in r_dict.items() if k in col_names and k != "id"}
                    p = PaymentRecord(**filtered)
                    pg_db.add(p)
            pg_db.commit()

        # C. Gift Requests
        s_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='gift_requests'")
        if s_cur.fetchone():
            s_cur.execute("SELECT * FROM gift_requests")
            rows = s_cur.fetchall()
            print(f"[*] Migrating {len(rows)} commission request(s)...")
            for r in rows:
                r_dict = dict(r)
                ref_id = r_dict.get("reference_id")
                existing = pg_db.query(GiftRequest).filter(GiftRequest.reference_id == ref_id).first() if ref_id else None
                if not existing:
                    col_names = {c.name for c in GiftRequest.__table__.columns}
                    filtered = {k: v for k, v in r_dict.items() if k in col_names and k != "id"}
                    gr = GiftRequest(**filtered)
                    pg_db.add(gr)
            pg_db.commit()

        # D. Consultations
        s_cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='consultations'")
        if s_cur.fetchone():
            s_cur.execute("SELECT * FROM consultations")
            rows = s_cur.fetchall()
            print(f"[*] Migrating {len(rows)} consultation booking(s)...")
            for r in rows:
                r_dict = dict(r)
                col_names = {c.name for c in ConsultationBooking.__table__.columns}
                filtered = {k: v for k, v in r_dict.items() if k in col_names and k != "id"}
                cb = ConsultationBooking(**filtered)
                pg_db.add(cb)
            pg_db.commit()

        print("[OK] Migration completed successfully!")
        print("[OK] All existing orders, payments, tracking, and concierge users are now in Neon PostgreSQL.")
        return True

    except Exception as e:
        pg_db.rollback()
        print(f"[ERROR] Migration failed: {e}")
        return False
    finally:
        pg_db.close()
        sqlite_conn.close()


if __name__ == "__main__":
    arg_url = sys.argv[1] if len(sys.argv) > 1 else None
    run_migration(arg_url)

