import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./shvom.db")

# Convert postgres:// to postgresql:// for SQLAlchemy compatibility (common on cloud hosts)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Convert mysql:// to mysql+pymysql:// for Hostinger MySQL compatibility
if DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)

# In serverless environments like Vercel, the root filesystem is read-only except /tmp
if os.environ.get("VERCEL") and DATABASE_URL.startswith("sqlite:///./"):
    DATABASE_URL = "sqlite:////tmp/shvom.db"

# SQLite specific connect_args to support multi-threaded FastAPI calls
connect_args = {"check_same_thread": False, "timeout": 30} if DATABASE_URL.startswith("sqlite") else {}

if DATABASE_URL.startswith("sqlite:///"):
    db_file_path = DATABASE_URL.replace("sqlite:///", "")
    db_dir = os.path.dirname(db_file_path)
    if db_dir:
        try:
            os.makedirs(db_dir, exist_ok=True)
        except OSError:
            pass

engine_kwargs = {"connect_args": connect_args}
if not DATABASE_URL.startswith("sqlite"):
    engine_kwargs.update({
        "pool_pre_ping": True,
        "pool_recycle": 3600,
    })

engine = create_engine(DATABASE_URL, **engine_kwargs)

if DATABASE_URL.startswith("sqlite"):
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def migrate_db_schema():
    """Ensures newly added columns in SQLite tables exist."""
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            # 1. Check table columns for payments
            res = conn.execute(text("PRAGMA table_info(payments)"))
            cols = {row[1] for row in res.fetchall()}
            if cols:
                if "order_id" not in cols:
                    conn.execute(text("ALTER TABLE payments ADD COLUMN order_id VARCHAR(64)"))
                if "cf_order_id" not in cols:
                    conn.execute(text("ALTER TABLE payments ADD COLUMN cf_order_id VARCHAR(64)"))
                if "payment_session_id" not in cols:
                    conn.execute(text("ALTER TABLE payments ADD COLUMN payment_session_id VARCHAR(255)"))
                if "currency" not in cols:
                    conn.execute(text("ALTER TABLE payments ADD COLUMN currency VARCHAR(10) DEFAULT 'INR'"))
                if "updated_at" not in cols:
                    conn.execute(text("ALTER TABLE payments ADD COLUMN updated_at DATETIME"))
                if "invoice_no" not in cols:
                    conn.execute(text("ALTER TABLE payments ADD COLUMN invoice_no VARCHAR(64)"))
                if "tracking_status" not in cols:
                    conn.execute(text("ALTER TABLE payments ADD COLUMN tracking_status VARCHAR(64) DEFAULT 'Payment Verified'"))
                if "courier_name" not in cols:
                    conn.execute(text("ALTER TABLE payments ADD COLUMN courier_name VARCHAR(128)"))
                if "tracking_number" not in cols:
                    conn.execute(text("ALTER TABLE payments ADD COLUMN tracking_number VARCHAR(128)"))
                if "tracking_url" not in cols:
                    conn.execute(text("ALTER TABLE payments ADD COLUMN tracking_url VARCHAR(512)"))
                if "estimated_delivery" not in cols:
                    conn.execute(text("ALTER TABLE payments ADD COLUMN estimated_delivery VARCHAR(64)"))
                if "tracking_notes" not in cols:
                    conn.execute(text("ALTER TABLE payments ADD COLUMN tracking_notes TEXT"))
                if "item_tracking_json" not in cols:
                    conn.execute(text("ALTER TABLE payments ADD COLUMN item_tracking_json TEXT"))
                conn.commit()

            # 2. Check table columns for gift_requests
            res_req = conn.execute(text("PRAGMA table_info(gift_requests)"))
            cols_req = {row[1] for row in res_req.fetchall()}
            if cols_req:
                if "invoice_no" not in cols_req:
                    conn.execute(text("ALTER TABLE gift_requests ADD COLUMN invoice_no VARCHAR(64)"))
                if "tracking_status" not in cols_req:
                    conn.execute(text("ALTER TABLE gift_requests ADD COLUMN tracking_status VARCHAR(64) DEFAULT 'Order Confirmed'"))
                if "courier_name" not in cols_req:
                    conn.execute(text("ALTER TABLE gift_requests ADD COLUMN courier_name VARCHAR(128)"))
                if "tracking_number" not in cols_req:
                    conn.execute(text("ALTER TABLE gift_requests ADD COLUMN tracking_number VARCHAR(128)"))
                if "tracking_url" not in cols_req:
                    conn.execute(text("ALTER TABLE gift_requests ADD COLUMN tracking_url VARCHAR(512)"))
                if "estimated_delivery" not in cols_req:
                    conn.execute(text("ALTER TABLE gift_requests ADD COLUMN estimated_delivery VARCHAR(64)"))
                if "tracking_notes" not in cols_req:
                    conn.execute(text("ALTER TABLE gift_requests ADD COLUMN tracking_notes TEXT"))
                if "item_tracking_json" not in cols_req:
                    conn.execute(text("ALTER TABLE gift_requests ADD COLUMN item_tracking_json TEXT"))
                conn.commit()
    except Exception:
        # Ignore if table doesn't exist yet or non-sqlite engine
        pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
