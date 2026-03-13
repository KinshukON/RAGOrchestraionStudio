"""
Auth Middleware – FastAPI dependency for JWT verification and RBAC enforcement.

Usage:
    from auth_middleware import require_auth, require_permission

    @router.get("/sensitive")
    async def endpoint(current_user = Depends(require_auth)):
        ...

    @router.post("/admin-only")
    async def admin_endpoint(current_user = Depends(require_permission("admin:write"))):
        ...
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional, List

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# ── Constants ─────────────────────────────────────────────────────────────────
_ALGORITHM = "HS256"
_ACCESS_MINUTES = int(os.getenv("AUTH_ACCESS_TOKEN_MINUTES", "60"))
_REFRESH_DAYS = int(os.getenv("AUTH_REFRESH_TOKEN_DAYS", "7"))

bearer_scheme = HTTPBearer(auto_error=False)


def _secret() -> str:
    return os.getenv("AUTH_JWT_SECRET", os.getenv("SECRET_KEY", "change-me-in-production"))


# ── Token Creation ────────────────────────────────────────────────────────────

def create_access_token(
    user_id: str,
    email: str,
    name: str,
    permissions: List[str] | None = None,
) -> tuple[str, int]:
    """Return (access_token, expires_in_seconds)."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=_ACCESS_MINUTES)
    claims = {
        "sub": user_id,
        "email": email,
        "name": name,
        "permissions": permissions or [],
        "token_type": "access",
        "exp": expire,
        "iat": now,
    }
    token = jwt.encode(claims, _secret(), algorithm=_ALGORITHM)
    return token, _ACCESS_MINUTES * 60


def create_refresh_token(user_id: str) -> str:
    """Return a long-lived refresh token (opaque to the frontend)."""
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=_REFRESH_DAYS)
    claims = {
        "sub": user_id,
        "token_type": "refresh",
        "exp": expire,
        "iat": now,
    }
    return jwt.encode(claims, _secret(), algorithm=_ALGORITHM)


# ── Token Verification ────────────────────────────────────────────────────────

class TokenPayload:
    def __init__(self, sub: str, email: str, name: str, permissions: List[str]):
        self.user_id = sub
        self.email = email
        self.name = name
        self.permissions = permissions

    def has_permission(self, perm: str) -> bool:
        return perm in self.permissions or "super:admin" in self.permissions


def _decode_token(token: str, expected_type: str = "access") -> TokenPayload:
    try:
        claims = jwt.decode(token, _secret(), algorithms=[_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if claims.get("token_type") != expected_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Expected {expected_type} token",
        )

    return TokenPayload(
        sub=claims["sub"],
        email=claims.get("email", ""),
        name=claims.get("name", ""),
        permissions=claims.get("permissions", []),
    )


# ── FastAPI Dependencies ───────────────────────────────────────────────────────

def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> TokenPayload:
    """
    FastAPI dependency that verifies the Bearer JWT.
    Raises 401 if the token is missing, invalid, or expired.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _decode_token(credentials.credentials, expected_type="access")


def require_refresh_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> TokenPayload:
    """FastAPI dependency for the /auth/refresh endpoint."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )
    return _decode_token(credentials.credentials, expected_type="refresh")


def require_permission(permission: str):
    """
    Dependency factory — returns a dependency that checks for a specific permission.

    Usage:
        @router.post("/publish")
        async def publish(..., user = Depends(require_permission("workflow:publish"))):
    """
    def _check(user: TokenPayload = Depends(require_auth)) -> TokenPayload:
        if not user.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {permission}",
            )
        return user

    return _check


# ── Optional auth (returns None if no token, instead of raising) ──────────────

def optional_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[TokenPayload]:
    """Returns the decoded token payload or None (never raises). For soft-auth endpoints."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return _decode_token(credentials.credentials, expected_type="access")
    except HTTPException:
        return None
