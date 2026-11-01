"""
Passenger WSGI adapter for Hostinger Python Application Manager.
Phusion Passenger operates via WSGI, while FastAPI is an ASGI application.
`a2wsgi` translates between WSGI and ASGI seamlessly.
"""
import sys
import os

# Add current and parent directories to sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from a2wsgi import ASGIMiddleware
from app.main import app as asgi_app

application = ASGIMiddleware(asgi_app)

