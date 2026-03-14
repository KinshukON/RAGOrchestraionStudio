"""
Vercel Python Serverless Function entry point.
Wraps the FastAPI ASGI app with Mangum (Lambda adapter used by Vercel internally).
"""
import sys
import os

# Resolve backend/ directory (this file lives at api/index.py → ../backend)
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))

# Add backend/ to sys.path so routers, models, db etc. all resolve
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

# Set cwd to backend/ so relative paths (alembic.ini etc.) resolve
os.chdir(_BACKEND_DIR)

from mangum import Mangum  # noqa: E402
from main import app       # noqa: E402  – imports backend/main.py

# Mangum wraps the ASGI app as a Lambda-compatible handler (Vercel uses Lambda internally)
handler = Mangum(app, lifespan="off")
