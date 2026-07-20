"""
Push a cache-refresh webhook to a client's PanBI deployment after their
license changes, so package-tier / feature changes propagate near-instantly
instead of waiting for PanConnect's ~1h auto-revalidate + PanBI's 15min
cache.

Best-effort, fire-and-forget — a client's PanBI being unreachable must
never block or fail a license save. Mirrors app/services/email.py's
never-raise-just-log convention (read that file for the precedent).
"""
import logging
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)


async def push_panbi_refresh(panbi_url: str | None, license_key: str) -> bool:
    """
    POSTs to {panbi_url}/api/license/webhook-refresh with the shared secret
    header. Returns True on a 2xx response, False otherwise (missing config,
    network error, non-2xx). Never raises.
    """
    settings = get_settings()
    if not panbi_url or not settings.PANBI_REFRESH_SECRET:
        return False

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{panbi_url.rstrip('/')}/api/license/webhook-refresh",
                headers={"X-License-Refresh-Secret": settings.PANBI_REFRESH_SECRET},
            )
            if 200 <= response.status_code < 300:
                return True
            logger.warning(
                "PanBI refresh push failed for %s (%s): HTTP %s",
                license_key, panbi_url, response.status_code,
            )
            return False
    except Exception as e:
        logger.warning(
            "PanBI refresh push errored for %s (%s): %s",
            license_key, panbi_url, e,
        )
        return False
