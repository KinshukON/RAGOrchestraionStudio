"""
rate_limit.py — Lightweight in-process rate limiter for sensitive endpoints.

Uses a per-(user_id, endpoint) sliding-window counter stored in a module-level dict.
No external dependencies required. Resets per 60-second window.

Usage:
    from rate_limit import enforce_rate_limit

    @router.post("/{id}/publish")
    async def publish(id: str, user = Depends(require_permission("publish_workflows"))):
        enforce_rate_limit(user.user_id, "publish", limit=10, window_seconds=60)
        ...
"""
from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock
from fastapi import HTTPException, status

# { (user_id, endpoint): [(timestamp, count)] }
_counters: dict[tuple[str, str], list[float]] = defaultdict(list)
_lock = Lock()


def enforce_rate_limit(
    user_id: str,
    endpoint: str,
    limit: int = 10,
    window_seconds: int = 60,
) -> None:
    """
    Raises HTTP 429 if user has exceeded `limit` calls to `endpoint`
    within the last `window_seconds` seconds.
    """
    key = (user_id, endpoint)
    now = time.monotonic()
    cutoff = now - window_seconds

    with _lock:
        calls = _counters[key]
        # Slide the window
        calls[:] = [ts for ts in calls if ts > cutoff]
        if len(calls) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Rate limit exceeded: {limit} calls per {window_seconds}s for '{endpoint}'. "
                    "Please wait before retrying."
                ),
                headers={"Retry-After": str(window_seconds)},
            )
        calls.append(now)
