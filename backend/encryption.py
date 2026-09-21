"""
encryption.py — application-level encryption at rest for sensitive
uploaded files (KYC documents: Aadhaar, PAN, bank passbook, etc.),
stored in GridFS. GridFS/MongoDB itself has no built-in at-rest
encryption in a typical self-hosted deployment, so this encrypts bytes
before fs.put(...) and decrypts after fs.get(...) — see
routes/documents.py.

FILE_ENCRYPTION_KEY must be a Fernet key (32 url-safe base64-encoded
bytes — generate one with `Fernet.generate_key()` once per environment
and keep it in a secrets manager, not source control). Same
fail-fast-in-production / warn-in-dev pattern as JWT_SECRET_KEY in
app.py: losing this key permanently loses access to every encrypted
file, so it must be a durable, backed-up secret in any real deployment.
"""
import logging
import os

log = logging.getLogger(__name__)

_fernet = None


def _get_fernet():
    global _fernet
    if _fernet is not None:
        return _fernet

    from cryptography.fernet import Fernet
    key = os.getenv('FILE_ENCRYPTION_KEY')
    if not key:
        if os.getenv('FLASK_ENV') == 'production':
            raise RuntimeError(
                'FILE_ENCRYPTION_KEY must be set in production — refusing to '
                'encrypt files with a key that would be lost on restart.'
            )
        key = Fernet.generate_key().decode()
        log.warning(
            'FILE_ENCRYPTION_KEY not set — using an ephemeral dev-only key. '
            'Files encrypted this run become UNREADABLE after restart. '
            'Set FILE_ENCRYPTION_KEY in backend/.env before deploying.'
        )
    _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt_bytes(data: bytes) -> bytes:
    return _get_fernet().encrypt(data)


def decrypt_bytes(data: bytes) -> bytes:
    return _get_fernet().decrypt(data)
