"""
Vercel Python Serverless Function – FastAPI via Mangum.
Catches all import/startup errors and returns them as JSON for easy debugging.
"""
import sys
import os
import json
import traceback
from typing import Optional
from http.server import BaseHTTPRequestHandler

# ── Path setup ────────────────────────────────────────────────────────────────
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
os.chdir(_BACKEND_DIR)

# ── Try importing the full FastAPI app ───────────────────────────────────────
_import_error: Optional[str] = None
_handler = None

try:
    from mangum import Mangum
    from main import app  # backend/main.py
    _handler = Mangum(app, lifespan="off")
except Exception:
    _import_error = traceback.format_exc()


# ── Fallback: surface the import error as JSON ────────────────────────────────
if _handler is not None:
    handler = _handler  # type: ignore[assignment]
else:
    _err_body = json.dumps({
        "error": "Python function failed to import backend",
        "traceback": _import_error,
        "backend_dir": _BACKEND_DIR,
        "backend_exists": os.path.isdir(_BACKEND_DIR),
        "sys_path": sys.path[:8],
    }, indent=2).encode()

    class handler(BaseHTTPRequestHandler):  # type: ignore[no-redef]
        def do_GET(self):
            self._send()

        def do_POST(self):
            self._send()

        def do_OPTIONS(self):
            self._send()

        def _send(self):
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(_err_body)))
            self.end_headers()
            self.wfile.write(_err_body)
