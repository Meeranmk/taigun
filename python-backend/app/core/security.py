"""
Authentication utilities
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import get_settings

settings = get_settings()

import bcrypt
import hashlib
import base64

# JWT settings
SECRET_KEY = settings.admin_session_secret
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/admin/auth", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash (Direct bcrypt + SHA256)"""
    try:
        # Pre-hash with SHA256 to allow > 72 chars
        pw_hash = hashlib.sha256(plain_password.encode()).digest()
        return bcrypt.checkpw(pw_hash, hashed_password.encode())
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash a password (Direct bcrypt + SHA256)"""
    # Pre-hash with SHA256 to allow > 72 chars
    pw_hash = hashlib.sha256(password.encode()).digest()
    # Generate salt and hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pw_hash, salt)
    return hashed.decode()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None
