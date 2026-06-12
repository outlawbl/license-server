"""
Admin autentifikacija — HTTP Basic protiv ADMIN_USERNAME/ADMIN_PASSWORD_HASH iz .env.

Hash se generiše sa: python scripts/generate_admin_password.py
"""

import secrets

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.core.config import get_settings

_security = HTTPBasic()


def require_admin(credentials: HTTPBasicCredentials = Depends(_security)) -> str:
    settings = get_settings()

    if not settings.ADMIN_PASSWORD_HASH:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ADMIN_PASSWORD_HASH nije konfigurisan — pokreni scripts/generate_admin_password.py",
        )

    username_ok = secrets.compare_digest(credentials.username, settings.ADMIN_USERNAME)
    try:
        password_ok = bcrypt.checkpw(
            credentials.password.encode("utf-8"),
            settings.ADMIN_PASSWORD_HASH.encode("utf-8"),
        )
    except Exception:
        password_ok = False

    if not (username_ok and password_ok):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Pogrešni admin kredencijali",
            headers={"WWW-Authenticate": "Basic"},
        )

    return credentials.username
