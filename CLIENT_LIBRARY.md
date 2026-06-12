# Panconnect License Client Library

Ovaj kod treba dodati u **Panconnect** aplikaciju.

## 1. Instalacija

Dodati u `requirements.txt`:
```
httpx==0.26.0
```

## 2. Kod za Panconnect

```python
# app/license/client.py

import httpx
import hashlib
import socket
import subprocess
import platform
from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.config import get_settings

settings = get_settings()


class LicenseInfo(BaseModel):
    status: str  # active, suspended, expired, revoked, not_found
    message: str
    client_name: Optional[str] = None
    features: list = []
    expires_at: Optional[datetime] = None
    token: Optional[str] = None
    token_expires_at: Optional[datetime] = None


def get_hardware_id() -> str:
    """Generiši hardware ID za ovu mašinu"""
    components = []

    # CPU info
    try:
        if platform.system() == "Linux":
            result = subprocess.run(
                ["cat", "/proc/cpuinfo"],
                capture_output=True,
                text=True,
                timeout=5
            )
            cpu_info = result.stdout
            for line in cpu_info.split("\n"):
                if "model name" in line:
                    components.append(line.strip())
                    break
        else:
            components.append(platform.processor() or "unknown")
    except Exception:
        components.append("cpu-unknown")

    # MAC adresa
    try:
        import uuid
        mac = ':'.join(['{:02x}'.format((uuid.getnode() >> i) & 0xff)
                        for i in range(0, 48, 8)][::-1])
        components.append(mac)
    except Exception:
        pass

    # Hostname
    try:
        components.append(socket.gethostname())
    except Exception:
        pass

    # Machine ID (Linux)
    try:
        if platform.system() == "Linux":
            with open("/etc/machine-id", "r") as f:
                components.append(f.read().strip())
    except Exception:
        pass

    combined = "|".join(components)
    return hashlib.sha256(combined.encode()).hexdigest()


class LicenseClient:
    """Klijent za komunikaciju sa license serverom"""

    def __init__(
        self,
        license_key: str,
        server_url: Optional[str] = None,
        timeout: float = 10.0
    ):
        self.license_key = license_key.strip().upper()
        self.server_url = server_url or "https://license.vasa-firma.com"
        self.timeout = timeout
        self.hardware_id = get_hardware_id()

        # Cached token
        self._cached_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    async def validate(self) -> LicenseInfo:
        """Validiraj licencu ka serveru"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(
                    f"{self.server_url}/api/v1/license/validate",
                    json={
                        "license_key": self.license_key,
                        "hardware_id": self.hardware_id,
                        "panconnect_version": settings.APP_VERSION
                    }
                )
                response.raise_for_status()
                data = response.json()

                # Cache token ako je dobijen
                if data.get("token"):
                    self._cached_token = data["token"]
                    self._token_expires_at = datetime.fromisoformat(
                        data["token_expires_at"]
                    ) if data.get("token_expires_at") else None

                return LicenseInfo(**data)

            except httpx.HTTPStatusError as e:
                return LicenseInfo(
                    status="error",
                    message=f"HTTP error: {e.response.status_code}"
                )
            except httpx.RequestError as e:
                return LicenseInfo(
                    status="error",
                    message=f"Connection error: {str(e)}"
                )
            except Exception as e:
                return LicenseInfo(
                    status="error",
                    message=f"Unexpected error: {str(e)}"
                )

    async def get_token(self) -> Optional[str]:
        """Dobavi validan JWT token (koristi cache ako je aktualan)"""
        # Ako imamo cached token koji nije istekao
        if self._cached_token and self._token_expires_at:
            if datetime.utcnow() < self._token_expires_at:
                return self._cached_token

        # Inače osvježi
        info = await self.validate()
        return info.token if info.status == "active" else None

    def is_valid(self, info: LicenseInfo) -> bool:
        """Provjeri da li je licenca validna"""
        return info.status == "active"


# Singleton instance
_license_client: Optional[LicenseClient] = None


def get_license_client() -> LicenseClient:
    """Dobavi license client singleton"""
    global _license_client
    if _license_client is None:
        license_key = getattr(settings, "LICENSE_KEY", None)
        if not license_key:
            raise ValueError("LICENSE_KEY nije postavljen u settings")
        _license_client = LicenseClient(
            license_key=license_key,
            server_url=getattr(settings, "LICENSE_SERVER_URL", None)
        )
    return _license_client
```

## 3. Middleware za Panconnect (app/main.py)

```python
# Dodati u app/main.py

from app.license.client import get_license_client

@app.on_event("startup")
async def validate_license():
    """Provjeri licencu pri startu aplikacije"""
    # Skip u development mode ako želite
    if settings.DEBUG:
        logger.warning("License validation skipped in DEBUG mode")
        return

    try:
        client = get_license_client()
        info = await client.validate()

        if info.status != "active":
            logger.error(f"Invalid license: {info.message}")
            raise RuntimeError(
                f"Panconnect licenca nije važeca: {info.message}. "
                f"Kontaktirajte support@vasa-firma.com"
            )

        logger.info(f"License valid: {info.client_name}")

    except Exception as e:
        logger.error(f"License validation failed: {e}")
        raise
```

## 4. Environment variables (Panconnect .env)

```bash
# License
LICENSE_KEY=PC-XXXX-YYYY-ZZZZ
LICENSE_SERVER_URL=https://license.vasa-firma.com
```

## 5. Background refresh (opcionalno)

```python
# app/license/tasks.py

import asyncio
from datetime import datetime, timedelta
from app.license.client import get_license_client


async def license_refresh_task():
    """Pozadinski task za periodički refresh tokena"""
    while True:
        try:
            client = get_license_client()
            await client.validate()
            logger.info("License refreshed")
        except Exception as e:
            logger.error(f"License refresh failed: {e}")

        # Refresh svakih 12 sati
        await asyncio.sleep(12 * 3600)


# U app/main.py dodati:
# @app.on_event("startup")
# async def start_license_refresh():
#     asyncio.create_task(license_refresh_task())
```
