import os
import sys

# Ensure backend directory is in python path
backend_path = os.path.join(os.path.dirname(__file__), "..", "backend")
if os.path.exists(backend_path) and os.path.abspath(backend_path) not in sys.path:
    sys.path.insert(0, os.path.abspath(backend_path))

from dotenv import load_dotenv
load_dotenv()
load_dotenv(os.path.join(backend_path, ".env"))

from app.main import app
