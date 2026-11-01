"""
Top-level entrypoint for FastAPI service.
Re-exports `app` from `app.main` for Vercel and standard ASGI servers.
"""
from app.main import app

__all__ = ["app"]
