from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional
from enum import Enum


class LicenseStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    EXPIRED = "expired"
    REVOKED = "revoked"


# ==================== REQUEST SCHEMAS ====================

class LicenseValidateRequest(BaseModel):
    """Request that client sends to validate license"""
    license_key: str = Field(..., min_length=10, max_length=50)
    hardware_id: str = Field(..., min_length=10)
    panconnect_version: Optional[str] = None
    client_info: Optional[dict] = None  # Additional info about client


class LicenseCreate(BaseModel):
    """Admin - Create new license"""
    license_key: Optional[str] = None  # Auto-generate if not provided
    client_name: str = Field(..., min_length=2, max_length=255)
    client_email: Optional[EmailStr] = None
    expires_at: Optional[datetime] = None  # None = lifetime
    features: list[str] = ["pantheon"]  # Default features
    hardware_id: Optional[str] = None  # Bind to specific hardware
    notes: Optional[str] = None


class LicenseUpdate(BaseModel):
    """Admin - Update license"""
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    status: Optional[LicenseStatus] = None
    expires_at: Optional[datetime] = None
    features: Optional[list[str]] = None
    hardware_id: Optional[str] = None
    notes: Optional[str] = None


# ==================== RESPONSE SCHEMAS ====================

class LicenseValidateResponse(BaseModel):
    """Response to client's validation request"""
    status: str  # active, suspended, expired, revoked, not_found
    message: str
    client_name: Optional[str] = None
    features: list[str] = []
    expires_at: Optional[datetime] = None
    token: Optional[str] = None  # JWT token for subsequent requests
    token_expires_at: Optional[datetime] = None
    server_time: datetime


class LicenseResponse(BaseModel):
    """Admin - Full license info"""
    id: int
    license_key: str
    client_name: str
    client_email: Optional[str] = None
    hardware_id: Optional[str] = None
    status: LicenseStatus
    expires_at: Optional[datetime] = None
    issued_at: datetime
    features: list[str]
    notes: Optional[str] = None
    last_validated_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    validation_count: int
    panconnect_version: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LicenseListResponse(BaseModel):
    """Admin - Paginated license list"""
    total: int
    page: int
    page_size: int
    licenses: list[LicenseResponse]


class StatsResponse(BaseModel):
    """Admin - Server statistics"""
    total_licenses: int
    active_licenses: int
    suspended_licenses: int
    expired_licenses: int
    validations_today: int
    validations_this_month: int
    active_last_24h: int
