"""
Vercel Python Serverless Function entry point.
Routes all /api/* requests through FastAPI via the Mangum ASGI adapter.
"""
import sys
import os

# Add backend/ to the Python path so all our modules resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from mangum import Mangum  # noqa: E402
from main import app  # noqa: E402  (backend/main.py)

# Mangum wraps the ASGI app for AWS Lambda (which Vercel Functions use internally).
# lifespan="off" disables startup/shutdown events since Vercel Functions are stateless
# — Alembic migrations are run separately via `make db-upgrade` not at function startup.
handler = Mangum(app, lifespan="off")
