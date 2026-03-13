"""
Vercel Python Serverless Function – diagnostic version.
Catches import errors and returns them as JSON so we can see the exact traceback.
"""
import sys
import os
import json
import traceback

# Resolve backend/ relative to this file (api/index.py → ../backend)
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
os.chdir(_BACKEND_DIR)

_import_error = None

try:
    from mangum import Mangum
    from main import app
    handler = Mangum(app, lifespan="off")
except Exception:
    _import_error = traceback.format_exc()

    # Fall back to a minimal WSGI handler that reports the error
    from http.server import BaseHTTPRequestHandler

    class handler(BaseHTTPRequestHandler):  # type: ignore[no-redef]
        def do_GET(self):
            self._respond()

        def do_POST(self):
            self._respond()

        def _respond(self):
            body = json.dumps({
                "error": "Python function failed to import backend",
                "detail": _import_error,
                "sys_path": sys.path[:5],
                "backend_dir_exists": os.path.isdir(_BACKEND_DIR),
            }).encode()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
