"""
Cryptography utilities for reversible encryption
"""
from cryptography.fernet import Fernet
from app.core.config import get_settings
import base64
import hashlib

settings = get_settings()

def get_cipher_suite():
    """Derive value Ferent key from session secret"""
    # Fernet requires a 32-byte URL-safe base64-encoded key
    # We use SHA256 to hash the secret to 32 bytes, then base64 encode it
    key = hashlib.sha256(settings.admin_session_secret.encode()).digest()
    key_b64 = base64.urlsafe_b64encode(key)
    return Fernet(key_b64)

def encrypt(text: str) -> str:
    """Encrypt string value"""
    if not text: 
        return None
    cipher = get_cipher_suite()
    return cipher.encrypt(text.encode()).decode()

def decrypt(text: str) -> str:
    """Decrypt string value"""
    if not text: 
        return None
    try:
        cipher = get_cipher_suite()
        return cipher.decrypt(text.encode()).decode()
    except Exception:
        # If decryption fails (e.g. key changed or invalid data), return None or empty
        return None
