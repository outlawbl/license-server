from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from jose import JWTError, jwt
from app.core.config import get_settings

settings = get_settings()


def _load_key(path: str) -> Optional[str]:
    if path and Path(path).is_file():
        return Path(path).read_text()
    return None


# RS256 ako je keypair konfigurisan, inače HS256 (backward compat)
_PRIVATE_KEY = _load_key(settings.JWT_PRIVATE_KEY_FILE)
_PUBLIC_KEY = _load_key(settings.JWT_PUBLIC_KEY_FILE)

if _PRIVATE_KEY:
    _SIGN_KEY = _PRIVATE_KEY
    _VERIFY_KEY = _PUBLIC_KEY or _PRIVATE_KEY
    _ALGORITHM = "RS256"
else:
    _SIGN_KEY = settings.JWT_SECRET_KEY
    _VERIFY_KEY = settings.JWT_SECRET_KEY
    _ALGORITHM = settings.JWT_ALGORITHM


def create_license_token(
    license_key: str,
    client_name: str,
    features: list[str],
    expires_at: Optional[datetime] = None
) -> tuple[str, datetime]:
    """
    Create JWT token for licensed client.

    Returns: (token_string, token_expires_at)
    """
    # Token expires sooner than license (for security)
    token_expiry = datetime.utcnow() + timedelta(
        hours=settings.LICENSE_TOKEN_EXPIRY_HOURS
    )

    payload = {
        "sub": license_key,
        "client": client_name,
        "features": features,
        "license_expires": expires_at.isoformat() if expires_at else None,
        "exp": token_expiry,
        "iat": datetime.utcnow(),
        "type": "license"
    }

    token = jwt.encode(payload, _SIGN_KEY, algorithm=_ALGORITHM)

    return token, token_expiry


def verify_license_token(token: str) -> Optional[dict]:
    """
    Verify JWT token and return payload.

    Returns None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, _VERIFY_KEY, algorithms=[_ALGORITHM])

        # Check if it's a license token
        if payload.get("type") != "license":
            return None

        return payload
    except JWTError:
        return None
