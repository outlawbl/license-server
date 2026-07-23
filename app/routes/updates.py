"""
Distribucija PanConnect update paketa klijentima — delta update umjesto punog
Windows installera za svaku izmjenu (vidi PanConnect scripts/updater/).

Objavljivanje (build mašina, admin auth preko HTTP Basic):
  POST /api/v1/admin/updates/publish

Klijent (PanConnect updater servis na klijentovom serveru, auth preko license_key):
  GET /api/v1/updates/manifest
  GET /api/v1/updates/file/{version}/{file_path}
"""

import hashlib
import json
import shutil
import zipfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_admin
from app.core.config import get_settings
from app.core.database import get_db
from app.models.models import License, LicenseStatus
from app.services.jwt import create_update_manifest_token

settings = get_settings()

admin_router = APIRouter(
    prefix="/api/v1/admin/updates",
    tags=["admin-updates"],
    dependencies=[Depends(require_admin)],
)
public_router = APIRouter(prefix="/api/v1/updates", tags=["updates"])


def _updates_root() -> Path:
    root = Path(settings.UPDATES_DIR)
    root.mkdir(parents=True, exist_ok=True)
    return root


def _version_tuple(v: str) -> tuple:
    try:
        return tuple(int(p) for p in v.strip().split("."))
    except ValueError:
        return (0,)


async def _require_active_license(license_key: str, db: AsyncSession) -> License:
    result = await db.execute(
        select(License).where(License.license_key == license_key.strip().upper())
    )
    lic = result.scalar_one_or_none()
    if not lic or lic.status != LicenseStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Nevažeća ili neaktivna licenca")
    return lic


@admin_router.post("/publish")
async def publish_update(
    version: str = Form(...),
    package: UploadFile = File(...),
):
    """
    Objavi novu verziju.

    `package` je zip sadržaja build\\dist\\PanConnect BEZ *.xml, *Service.exe i
    *Updater.exe fajlova (te service-wrapper fajlove upravlja installer, updater
    ih nikad ne dira) — vidi scripts/publish_update.ps1 u panconnect repou.
    Raspakuje paket, hashuje svaki fajl (SHA256) i upisuje manifest + latest
    pokazivač koji /api/v1/updates/manifest čita.
    """
    version = version.strip()
    if not version or _version_tuple(version) == (0,):
        raise HTTPException(status_code=400, detail="Nevažeći format verzije (očekivano X.Y.Z)")

    dest_dir = _updates_root() / version
    files_dir = dest_dir / "files"
    if files_dir.exists():
        shutil.rmtree(files_dir)
    files_dir.mkdir(parents=True, exist_ok=True)

    tmp_zip = dest_dir / "_upload.zip"
    try:
        with tmp_zip.open("wb") as f:
            shutil.copyfileobj(package.file, f)

        files_root_resolved = files_dir.resolve()
        with zipfile.ZipFile(tmp_zip) as zf:
            for member in zf.namelist():
                # Zaštita od directory traversal iz sadržaja zip fajla
                target = (files_dir / member).resolve()
                if files_root_resolved not in target.parents and target != files_root_resolved:
                    raise HTTPException(
                        status_code=400, detail=f"Sumnjiva putanja u paketu: {member}"
                    )
            zf.extractall(files_dir)
    finally:
        tmp_zip.unlink(missing_ok=True)

    manifest_files = {}
    for path in files_dir.rglob("*"):
        if path.is_file():
            rel = path.relative_to(files_dir).as_posix()
            manifest_files[rel] = hashlib.sha256(path.read_bytes()).hexdigest()

    manifest = {"version": version, "files": manifest_files}
    (dest_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    (_updates_root() / "latest.json").write_text(json.dumps({"version": version}))

    return {"version": version, "file_count": len(manifest_files)}


@public_router.get("/manifest")
async def get_update_manifest(
    license_key: str = Query(...),
    current_version: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """PanConnect updater periodično zove ovo da provjeri da li postoji nova verzija."""
    await _require_active_license(license_key, db)

    latest_path = _updates_root() / "latest.json"
    if not latest_path.exists():
        return {"update_available": False}

    latest_version = json.loads(latest_path.read_text())["version"]
    if _version_tuple(latest_version) <= _version_tuple(current_version):
        return {"update_available": False}

    manifest_path = _updates_root() / latest_version / "manifest.json"
    if not manifest_path.exists():
        return {"update_available": False}

    manifest = json.loads(manifest_path.read_text())
    token = create_update_manifest_token(manifest)
    return {"update_available": True, "version": latest_version, "manifest_token": token}


@public_router.get("/file/{version}/{file_path:path}")
async def download_update_file(
    version: str,
    file_path: str,
    license_key: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Servira pojedinačni fajl iz objavljenog update paketa (delta download)."""
    await _require_active_license(license_key, db)

    files_root = (_updates_root() / version / "files").resolve()
    target = (files_root / file_path).resolve()
    if (files_root != target and files_root not in target.parents) or not target.is_file():
        raise HTTPException(status_code=404, detail="Fajl nije pronađen")

    return FileResponse(target)
