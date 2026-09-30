"""
api/index.py — Vercel's entry point for the Flask app.

Vercel's Python runtime looks for files under api/ and serves the WSGI callable
named `app`. vercel.json rewrites every path here, so Flask keeps its own
routing and the URLs are unchanged from any other deployment.

The parent directory goes on sys.path because the app is imported as a
top-level module (`app`, `routes.*`, `services.*`) rather than a package, and
the function's working directory is not guaranteed to be backend/.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app  # noqa: E402  (the path insert has to come first)

# Vercel serves this name.
application = app
