"""
extensions.py — shared Flask extension instances, created here (not in
app.py) so route modules can import them without a circular import on
app.py (which itself imports the route blueprints).
"""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=[])
