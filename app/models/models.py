from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
import enum

Base = declarative_base()


class LicenseStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    EXPIRED = "expired"
    REVOKED = "revoked"


class License(Base):
    __tablename__ = "licenses"

    id = Column(Integer, primary_key=True, index=True)
    license_key = Column(String(50), unique=True, index=True, nullable=False)
    client_name = Column(String(255), nullable=False)
    client_email = Column(String(255))

    # Hardware fingerprint binding
    hardware_id = Column(String(64), index=True)  # SHA256 hash

    # Licence metadata
    status = Column(String(20), default=LicenseStatus.ACTIVE, index=True)
    expires_at = Column(DateTime, nullable=True)  # NULL = lifetime
    issued_at = Column(DateTime, default=func.now())

    # Features koja su uključena
    features = Column(Text)  # JSON string: ["pantheon", "wms", "invoicing"]

    # Notes (interno)
    notes = Column(Text)

    # Tracking
    last_validated_at = Column(DateTime)
    last_seen_at = Column(DateTime)
    validation_count = Column(Integer, default=0)

    # Version tracking
    panconnect_version = Column(String(20))  # Zadnja prijavljena verzija

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class ValidationLog(Base):
    __tablename__ = "validation_logs"

    id = Column(Integer, primary_key=True, index=True)
    license_key = Column(String(50), index=True, nullable=False)
    hardware_id = Column(String(64))

    # Request info
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(String(500))
    panconnect_version = Column(String(20))

    # Response
    status = Column(String(20))  # granted, denied, expired, suspended
    reason = Column(String(255))

    # Token info
    token_issued = Column(Boolean, default=False)

    timestamp = Column(DateTime, default=func.now(), index=True)
