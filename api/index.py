"""
Vercel Python Serverless Function – FastAPI entry point.

Vercel's Python runtime natively supports ASGI apps via the `app` export.
No Mangum needed. The `app` object is the FastAPI instance from backend/main.py.
"""
import sys
import os

# Resolve backend/ relative to this file (api/index.py → ../backend)
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))

# Put backend/ on the path so all relative imports in routers resolve
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

# Change working directory so alembic.ini and other relative paths resolve
os.chdir(_BACKEND_DIR)

# Import the FastAPI app — Vercel detects the `app` export automatically
from main import app  # noqa: E402

# Also expose as `handler` for older Vercel Python runtimes that look for it
handler = app
