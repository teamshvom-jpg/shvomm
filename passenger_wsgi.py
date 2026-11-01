"""
Passenger WSGI adapter for Hostinger Python Application Manager (Root Entrypoint).
Phusion Passenger operates via WSGI, while FastAPI is an ASGI application.
`a2wsgi` translates between WSGI and ASGI seamlessly.
"""
import sys
import os

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(CURRENT_DIR, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from a2wsgi import ASGIMiddleware

try:
    from app.main import app as asgi_app
except ImportError:
    from backend.app.main import app as asgi_app

application = ASGIMiddleware(asgi_app)

