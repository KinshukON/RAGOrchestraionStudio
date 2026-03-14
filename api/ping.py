"""
api/ping.py — minimal Vercel Python Function.
No backend imports. Used to verify the raw Python Function runtime is healthy.
"""
from http.server import BaseHTTPRequestHandler
import json
import sys
import os


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({
            "ping": "pong",
            "python": sys.version,
            "cwd": os.getcwd(),
        }).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
