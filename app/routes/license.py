from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timedelta
from typing import Optional
import json

from app.core.database import get_db
from app.models.models import License, ValidationLog, LicenseStatus
from app.models.schemas import (
    LicenseValidateRequest,
    LicenseValidateResponse,
    LicenseCreate,
    LicenseUpdate,
    LicenseResponse,
    LicenseListResponse
)
from app.services.jwt import create_license_token
from app.services.hardware import is_valid_hardware_id, normalize_hardware_id

router = APIRouter(prefix="/api/v1/license", tags=["license"])


@router.post("/validate", response_model=LicenseValidateResponse)
async def validate_license(
    request: Request,
    data: LicenseValidateRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Main endpoint - klijent zove ovu rutu za validaciju.

    Proces:
    1. Pronađi licencu po license_key
    2. Provjeri status (active/suspended/expired/revoked)
    3. Provjeri expiry
    4. Ako je hardware_id binding aktivan - provjeri hardware
    5. Loguj request
    6. Vrati JWT token ako je sve OK
    """
    license_key = data.license_key.strip().upper()
    hardware_id = normalize_hardware_id(data.hardware_id)

    # Pronađi licencu
    result = await db.execute(
        select(License).where(License.license_key == license_key)
    )
    license_obj = result.scalar_one_or_none()

    # Extract IP
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:500]

    status = "not_found"
    reason = "License key not found"
    token = None
    token_expires = None
    client_name = None
    features = []
    license_expires = None

    if license_obj:
        client_name = license_obj.client_name
        features = json.loads(license_obj.features) if license_obj.features else []
        license_expires = license_obj.expires_at

        # Provjeri status
        if license_obj.status != LicenseStatus.ACTIVE:
            status = license_obj.status
            reason = f"License is {license_obj.status}"

        elif license_obj.expires_at and license_obj.expires_at < datetime.utcnow():
            status = "expired"
            reason = "License has expired"

        elif license_obj.hardware_id and license_obj.hardware_id != hardware_id:
            status = "denied"
            reason = "License bound to different hardware"

        else:
            # Sve OK - dodijeli token
            status = "active"
            reason = "License valid"
            token, token_expires = create_license_token(
                license_key,
                license_obj.client_name,
                features,
                license_obj.expires_at
            )

            # Update license tracking
            license_obj.last_validated_at = datetime.utcnow()
            license_obj.last_seen_at = datetime.utcnow()
            license_obj.validation_count += 1
            license_obj.hardware_id = hardware_id  # Auto-bind na prvi request
            if data.panconnect_version:
                license_obj.panconnect_version = data.panconnect_version

            await db.commit()

    # Loguj request
    log = ValidationLog(
        license_key=license_key,
        hardware_id=hardware_id,
        ip_address=ip_address,
        user_agent=user_agent,
        panconnect_version=data.panconnect_version,
        status=status,
        reason=reason,
        token_issued=(token is not None)
    )
    db.add(log)
    await db.commit()

    return LicenseValidateResponse(
        status=status,
        message=reason,
        client_name=client_name,
        features=features,
        expires_at=license_expires,
        token=token,
        token_expires_at=token_expires,
        server_time=datetime.utcnow()
    )


@router.get("/check/{license_key}", response_model=dict)
async def check_license(
    license_key: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Quick check da li licenca postoji (bez tokena).
    Korisno za pre-flight provjere.
    """
    license_key = license_key.strip().upper()

    result = await db.execute(
        select(License).where(License.license_key == license_key)
    )
    license_obj = result.scalar_one_or_none()

    if not license_obj:
        return {"exists": False}

    return {
        "exists": True,
        "status": license_obj.status,
        "client_name": license_obj.client_name,
        "expires_at": license_obj.expires_at
    }
