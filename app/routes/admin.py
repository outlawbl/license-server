from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from datetime import datetime, timedelta
from typing import Optional
import secrets
import json

from app.core.database import get_db
from app.core.auth import require_admin
from app.models.models import License, ValidationLog, LicenseStatus
from app.models.schemas import (
    LicenseResponse,
    LicenseCreate,
    LicenseUpdate,
    LicenseListResponse,
    StatsResponse
)

# Sve admin rute traže HTTP Basic auth (require_admin)
router = APIRouter(
    prefix="/api/v1/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)


def generate_license_key() -> str:
    """Generiši unique license key"""
    return f"PC-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"


@router.get("/stats", response_model=StatsResponse)
async def get_stats(db: AsyncSession = Depends(get_db)):
    """Admin statistics"""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    yesterday = now - timedelta(hours=24)

    # Total licenses
    total_result = await db.execute(select(func.count(License.id)))
    total_licenses = total_result.scalar() or 0

    # By status
    active_result = await db.execute(
        select(func.count(License.id)).where(License.status == LicenseStatus.ACTIVE)
    )
    active_licenses = active_result.scalar() or 0

    suspended_result = await db.execute(
        select(func.count(License.id)).where(License.status == LicenseStatus.SUSPENDED)
    )
    suspended_licenses = suspended_result.scalar() or 0

    expired_result = await db.execute(
        select(func.count(License.id)).where(
            and_(
                License.expires_at.isnot(None),
                License.expires_at < now
            )
        )
    )
    expired_licenses = expired_result.scalar() or 0

    # Validations
    validations_today_result = await db.execute(
        select(func.count(ValidationLog.id)).where(ValidationLog.timestamp >= today_start)
    )
    validations_today = validations_today_result.scalar() or 0

    validations_month_result = await db.execute(
        select(func.count(ValidationLog.id)).where(ValidationLog.timestamp >= month_start)
    )
    validations_this_month = validations_month_result.scalar() or 0

    # Active last 24h
    active_24h_result = await db.execute(
        select(func.count(License.id)).where(License.last_seen_at >= yesterday)
    )
    active_last_24h = active_24h_result.scalar() or 0

    return StatsResponse(
        total_licenses=total_licenses,
        active_licenses=active_licenses,
        suspended_licenses=suspended_licenses,
        expired_licenses=expired_licenses,
        validations_today=validations_today,
        validations_this_month=validations_this_month,
        active_last_24h=active_last_24h
    )


@router.get("/licenses", response_model=LicenseListResponse)
async def list_licenses(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List licenses with pagination and filters"""
    query = select(License)

    # Filters
    if status:
        query = query.where(License.status == status)

    if search:
        query = query.where(
            or_(
                License.client_name.ilike(f"%{search}%"),
                License.license_key.ilike(f"%{search}%"),
                License.client_email.ilike(f"%{search}%")
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Paginate
    query = query.order_by(License.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    licenses = result.scalars().all()

    # Convert to response
    license_responses = []
    for lic in licenses:
        license_responses.append(LicenseResponse(
            id=lic.id,
            license_key=lic.license_key,
            client_name=lic.client_name,
            client_email=lic.client_email,
            hardware_id=lic.hardware_id,
            cloud_mode=lic.cloud_mode,
            status=lic.status,
            expires_at=lic.expires_at,
            issued_at=lic.issued_at,
            features=json.loads(lic.features) if lic.features else [],
            notes=lic.notes,
            last_validated_at=lic.last_validated_at,
            last_seen_at=lic.last_seen_at,
            validation_count=lic.validation_count,
            panconnect_version=lic.panconnect_version,
            created_at=lic.created_at,
            updated_at=lic.updated_at
        ))

    return LicenseListResponse(
        total=total,
        page=page,
        page_size=page_size,
        licenses=license_responses
    )


@router.get("/licenses/{license_id}", response_model=LicenseResponse)
async def get_license(license_id: int, db: AsyncSession = Depends(get_db)):
    """Get single license by ID"""
    result = await db.execute(select(License).where(License.id == license_id))
    lic = result.scalar_one_or_none()

    if not lic:
        raise HTTPException(status_code=404, detail="License not found")

    return LicenseResponse(
        id=lic.id,
        license_key=lic.license_key,
        client_name=lic.client_name,
        client_email=lic.client_email,
        hardware_id=lic.hardware_id,
        cloud_mode=lic.cloud_mode,
        status=lic.status,
        expires_at=lic.expires_at,
        issued_at=lic.issued_at,
        features=json.loads(lic.features) if lic.features else [],
        notes=lic.notes,
        last_validated_at=lic.last_validated_at,
        last_seen_at=lic.last_seen_at,
        validation_count=lic.validation_count,
        panconnect_version=lic.panconnect_version,
        created_at=lic.created_at,
        updated_at=lic.updated_at
    )


@router.post("/licenses", response_model=LicenseResponse, status_code=201)
async def create_license(data: LicenseCreate, db: AsyncSession = Depends(get_db)):
    """Create new license"""
    # Generate key if not provided
    license_key = data.license_key or generate_license_key()

    # Check if key already exists
    existing = await db.execute(
        select(License).where(License.license_key == license_key)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="License key already exists")

    license_obj = License(
        license_key=license_key,
        client_name=data.client_name,
        client_email=data.client_email,
        expires_at=data.expires_at,
        features=json.dumps(data.features),
        hardware_id=data.hardware_id,
        cloud_mode=data.cloud_mode,
        notes=data.notes,
        status=LicenseStatus.ACTIVE
    )

    db.add(license_obj)
    await db.commit()
    await db.refresh(license_obj)

    return LicenseResponse(
        id=license_obj.id,
        license_key=license_obj.license_key,
        client_name=license_obj.client_name,
        client_email=license_obj.client_email,
        hardware_id=license_obj.hardware_id,
        cloud_mode=license_obj.cloud_mode,
        status=license_obj.status,
        expires_at=license_obj.expires_at,
        issued_at=license_obj.issued_at,
        features=json.loads(license_obj.features) if license_obj.features else [],
        notes=license_obj.notes,
        last_validated_at=license_obj.last_validated_at,
        last_seen_at=license_obj.last_seen_at,
        validation_count=license_obj.validation_count,
        panconnect_version=license_obj.panconnect_version,
        created_at=license_obj.created_at,
        updated_at=license_obj.updated_at
    )


@router.put("/licenses/{license_id}", response_model=LicenseResponse)
async def update_license(
    license_id: int,
    data: LicenseUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update license"""
    result = await db.execute(select(License).where(License.id == license_id))
    lic = result.scalar_one_or_none()

    if not lic:
        raise HTTPException(status_code=404, detail="License not found")

    # Update fields
    if data.client_name is not None:
        lic.client_name = data.client_name
    if data.client_email is not None:
        lic.client_email = data.client_email
    if data.status is not None:
        lic.status = data.status
    if data.expires_at is not None:
        lic.expires_at = data.expires_at
    if data.features is not None:
        lic.features = json.dumps(data.features)
    if data.hardware_id is not None:
        lic.hardware_id = data.hardware_id
    if data.cloud_mode is not None:
        lic.cloud_mode = data.cloud_mode
    if data.notes is not None:
        lic.notes = data.notes

    await db.commit()
    await db.refresh(lic)

    return LicenseResponse(
        id=lic.id,
        license_key=lic.license_key,
        client_name=lic.client_name,
        client_email=lic.client_email,
        hardware_id=lic.hardware_id,
        cloud_mode=lic.cloud_mode,
        status=lic.status,
        expires_at=lic.expires_at,
        issued_at=lic.issued_at,
        features=json.loads(lic.features) if lic.features else [],
        notes=lic.notes,
        last_validated_at=lic.last_validated_at,
        last_seen_at=lic.last_seen_at,
        validation_count=lic.validation_count,
        panconnect_version=lic.panconnect_version,
        created_at=lic.created_at,
        updated_at=lic.updated_at
    )


@router.delete("/licenses/{license_id}", status_code=204)
async def delete_license(license_id: int, db: AsyncSession = Depends(get_db)):
    """Delete license"""
    result = await db.execute(select(License).where(License.id == license_id))
    lic = result.scalar_one_or_none()

    if not lic:
        raise HTTPException(status_code=404, detail="License not found")

    await db.delete(lic)
    await db.commit()


@router.post("/licenses/{license_id}/suspend", response_model=LicenseResponse)
async def suspend_license(license_id: int, db: AsyncSession = Depends(get_db)):
    """Suspend license (quick action)"""
    result = await db.execute(select(License).where(License.id == license_id))
    lic = result.scalar_one_or_none()

    if not lic:
        raise HTTPException(status_code=404, detail="License not found")

    lic.status = LicenseStatus.SUSPENDED
    await db.commit()
    await db.refresh(lic)

    return LicenseResponse(
        id=lic.id,
        license_key=lic.license_key,
        client_name=lic.client_name,
        client_email=lic.client_email,
        hardware_id=lic.hardware_id,
        cloud_mode=lic.cloud_mode,
        status=lic.status,
        expires_at=lic.expires_at,
        issued_at=lic.issued_at,
        features=json.loads(lic.features) if lic.features else [],
        notes=lic.notes,
        last_validated_at=lic.last_validated_at,
        last_seen_at=lic.last_seen_at,
        validation_count=lic.validation_count,
        panconnect_version=lic.panconnect_version,
        created_at=lic.created_at,
        updated_at=lic.updated_at
    )


@router.post("/licenses/{license_id}/activate", response_model=LicenseResponse)
async def activate_license(license_id: int, db: AsyncSession = Depends(get_db)):
    """Activate license (quick action)"""
    result = await db.execute(select(License).where(License.id == license_id))
    lic = result.scalar_one_or_none()

    if not lic:
        raise HTTPException(status_code=404, detail="License not found")

    lic.status = LicenseStatus.ACTIVE
    await db.commit()
    await db.refresh(lic)

    return LicenseResponse(
        id=lic.id,
        license_key=lic.license_key,
        client_name=lic.client_name,
        client_email=lic.client_email,
        hardware_id=lic.hardware_id,
        cloud_mode=lic.cloud_mode,
        status=lic.status,
        expires_at=lic.expires_at,
        issued_at=lic.issued_at,
        features=json.loads(lic.features) if lic.features else [],
        notes=lic.notes,
        last_validated_at=lic.last_validated_at,
        last_seen_at=lic.last_seen_at,
        validation_count=lic.validation_count,
        panconnect_version=lic.panconnect_version,
        created_at=lic.created_at,
        updated_at=lic.updated_at
    )


@router.post("/licenses/{license_id}/reset-hardware", response_model=LicenseResponse)
async def reset_hardware(license_id: int, db: AsyncSession = Depends(get_db)):
    """
    Skini hardware binding — licenca se auto-binduje na sljedeći
    validate poziv (npr. nakon selidbe na novi server).
    """
    result = await db.execute(select(License).where(License.id == license_id))
    lic = result.scalar_one_or_none()

    if not lic:
        raise HTTPException(status_code=404, detail="License not found")

    lic.hardware_id = None
    await db.commit()
    await db.refresh(lic)

    return LicenseResponse(
        id=lic.id,
        license_key=lic.license_key,
        client_name=lic.client_name,
        client_email=lic.client_email,
        hardware_id=lic.hardware_id,
        cloud_mode=lic.cloud_mode,
        status=lic.status,
        expires_at=lic.expires_at,
        issued_at=lic.issued_at,
        features=json.loads(lic.features) if lic.features else [],
        notes=lic.notes,
        last_validated_at=lic.last_validated_at,
        last_seen_at=lic.last_seen_at,
        validation_count=lic.validation_count,
        panconnect_version=lic.panconnect_version,
        created_at=lic.created_at,
        updated_at=lic.updated_at
    )


@router.get("/logs")
async def list_validation_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    license_key: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Validation logovi (ko se javio, odakle, ishod) sa paginacijom."""
    query = select(ValidationLog)
    if license_key:
        query = query.where(ValidationLog.license_key == license_key.strip().upper())
    if status:
        query = query.where(ValidationLog.status == status)

    total = (await db.execute(
        select(func.count()).select_from(query.subquery())
    )).scalar() or 0

    result = await db.execute(
        query.order_by(ValidationLog.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    items = [
        {
            "id": log.id,
            "license_key": log.license_key,
            "hardware_id": log.hardware_id,
            "ip_address": log.ip_address,
            "panconnect_version": log.panconnect_version,
            "status": log.status,
            "reason": log.reason,
            "token_issued": log.token_issued,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        }
        for log in result.scalars().all()
    ]

    return {"items": items, "total": total, "page": page, "page_size": page_size}
