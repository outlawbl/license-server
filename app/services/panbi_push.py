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


async def push_panbi_refresh(
    panbi_url: str | None,
    license_key: str,
    tier: str | None = None,
    overrides: dict | None = None,
    ai_tool_overrides: dict | None = None,
) -> bool:
    """
    POSTs to {panbi_url}/api/license/webhook-refresh with the shared secret
    header. The JSON body is assembled from two independently-optional
    sections:

    - If `tier` is provided, sends {"tier": tier, "overrides": overrides} —
      PanBI writes this directly to its package config (a full remote push,
      not just a refresh signal).
    - If `ai_tool_overrides` is provided, sends
      {"ai_tool_overrides": {"add": [...], "remove": [...]}} — the per-tool
      AI chat overrides, which can't ride along in the flat `features[]`
      string array the way `ai_tier:<tier>` does.

    If neither is provided, sends no body at all — a plain cache-refresh
    signal, matching this function's original (pre-custom-control) behavior
    exactly, for callers/licenses where no package:<tier> is set and no AI
    overrides exist.

    Returns True on a 2xx response, False otherwise (missing config,
    network error, non-2xx). Never raises.
    """
    settings = get_settings()
    if not panbi_url or not settings.PANBI_REFRESH_SECRET:
        return False

    body: dict = {}
    if tier:
        body["tier"] = tier
        body["overrides"] = overrides or {"add": [], "remove": []}
    if ai_tool_overrides is not None:
        body["ai_tool_overrides"] = ai_tool_overrides

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            kwargs = {"headers": {"X-License-Refresh-Secret": settings.PANBI_REFRESH_SECRET}}
            if body:
                kwargs["json"] = body
            response = await client.post(
                f"{panbi_url.rstrip('/')}/api/license/webhook-refresh",
                **kwargs,
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
