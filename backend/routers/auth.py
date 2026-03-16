import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import jwt
import requests
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlmodel import select

from db import get_session_ctx
from models_admin import User, Session as UserSession, Role
from auth_middleware import (
    create_access_token,
    create_refresh_token,
    require_refresh_token,
    TokenPayload,
)


GOOGLE_TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo"


class GoogleSignInRequest(BaseModel):
    id_token: str = Field(..., description="Google ID token from Google Identity Services")


class AuthUser(BaseModel):
    id: str
    name: str
    email: str
    picture: str | None = None
    permissions: List[str] = []


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthUser


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


router = APIRouter()


def _verify_google_id_token(id_token: str) -> Dict[str, Any]:
    """Verify the Google ID token using Google's tokeninfo endpoint."""
    try:
        response = requests.get(
            GOOGLE_TOKENINFO_ENDPOINT,
            params={"id_token": id_token},
            timeout=5,
        )
    except requests.RequestException as exc:  # type: ignore[attr-defined]
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Google for token verification",
        ) from exc

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token",
        )

    payload = response.json()

    expected_aud = os.getenv("GOOGLE_CLIENT_ID")
    if expected_aud and payload.get("aud") != expected_aud:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token audience does not match configured client",
        )

    return payload


def _get_or_create_user(google_payload: Dict[str, Any]) -> tuple[User, List[str]]:
    """
    Look up or create a User row from the Google token payload.
    Returns (user, permissions_list).
    """
    google_sub = google_payload["sub"]
    email = google_payload.get("email", "")
    name = google_payload.get("name") or email
    picture = google_payload.get("picture")
    platform_admin_email = os.getenv("PLATFORM_ADMIN_EMAIL", "").lower().strip()

    with get_session_ctx() as db:
        existing = db.exec(select(User).where(User.email == email)).first()
        if existing:
            # Update last-seen info
            existing.name = name
            existing.external_subject = google_sub
            existing.picture_url = picture
            db.add(existing)
            db.commit()
            db.refresh(existing)
            user = existing
        else:
            # Create new user — no role_id by default (viewer access)
            user = User(
                external_provider="google",
                external_subject=google_sub,
                name=name,
                email=email,
                picture_url=picture,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Auto-bootstrap Platform Admin role for the designated admin email
        if platform_admin_email and email.lower() == platform_admin_email and not user.role_id:
            ADMIN_PERMS = {
                "super:admin": True,
                "administer_platform": True,
                "manage_users": True,
                "manage_roles": True,
                "manage_teams": True,
                "manage_integrations": True,
                "view_observability": True,
                "manage_governance": True,
            }
            admin_role = db.exec(select(Role).where(Role.name == "Platform Admin")).first()
            if not admin_role:
                admin_role = Role(name="Platform Admin", permissions=ADMIN_PERMS)
                db.add(admin_role)
                db.commit()
                db.refresh(admin_role)
            else:
                admin_role.permissions = ADMIN_PERMS
                db.add(admin_role)
                db.commit()
                db.refresh(admin_role)
            user.role_id = admin_role.id
            db.add(user)
            db.commit()
            db.refresh(user)

        # Resolve permissions from role if assigned
        permissions: List[str] = []
        if user.role_id:
            role_row = db.exec(select(Role).where(Role.id == user.role_id)).first()
            if role_row and isinstance(role_row.permissions, dict):
                # permissions stored as {"perm_key": true, ...} OR as a list
                raw = role_row.permissions
                permissions = [k for k, v in raw.items() if v] if isinstance(raw, dict) else list(raw)

    return user, permissions


def _create_db_session(user_id: int) -> None:
    """Persist the session record."""
    with get_session_ctx() as db:
        session = UserSession(
            user_id=user_id,
            status="active",
        )
        db.add(session)
        db.commit()


@router.post("/google", response_model=AuthResponse)
async def sign_in_with_google(payload: GoogleSignInRequest) -> AuthResponse:
    """
    Exchange a Google ID token for application access + refresh tokens.
    Creates/updates the User row and persists a Session record.
    """
    import traceback as _tb
    try:
        google_payload = _verify_google_id_token(payload.id_token)
        user, permissions = _get_or_create_user(google_payload)

        access_token, expires_in = create_access_token(
            user_id=str(user.id),
            email=user.email,
            name=user.name,
            permissions=permissions,
        )
        refresh_token = create_refresh_token(user_id=str(user.id))
        _create_db_session(user.id or 0)

        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
            user=AuthUser(
                id=str(user.id),
                name=user.name,
                email=user.email,
                permissions=permissions,
            ),
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Sign-in error: {type(exc).__name__}: {exc}",
        ) from exc


class GoogleCodeRequest(BaseModel):
    code: str = Field(..., description="OAuth 2.0 authorization code from Google redirect")
    redirect_uri: str = Field(..., description="Redirect URI used in the original auth request")


GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"


@router.post("/google-code", response_model=AuthResponse)
async def sign_in_with_google_code(payload: GoogleCodeRequest) -> AuthResponse:
    """
    Exchange a Google authorization code for application access + refresh tokens.
    Used by the redirect-based OAuth flow (replaces deprecated One Tap).
    Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars.
    """
    client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")

    if not client_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GOOGLE_CLIENT_SECRET is not configured on the server",
        )

    # Exchange authorization code for tokens
    try:
        token_response = requests.post(
            GOOGLE_TOKEN_ENDPOINT,
            data={
                "code": payload.code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": payload.redirect_uri,
                "grant_type": "authorization_code",
            },
            timeout=10,
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Google token endpoint",
        ) from exc

    if token_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google token exchange failed: {token_response.text}",
        )

    token_data = token_response.json()
    id_token = token_data.get("id_token")
    if not id_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google did not return an id_token",
        )

    # Reuse the existing id_token verification + user upsert logic
    google_payload = _verify_google_id_token(id_token)
    user, permissions = _get_or_create_user(google_payload)

    access_token, expires_in = create_access_token(
        user_id=str(user.id),
        email=user.email,
        name=user.name,
        permissions=permissions,
    )
    refresh_token = create_refresh_token(user_id=str(user.id))
    _create_db_session(user.id or 0)

    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=expires_in,
        user=AuthUser(
            id=str(user.id),
            name=user.name,
            email=user.email,
            permissions=permissions,
        ),
    )



@router.post("/refresh", response_model=RefreshResponse)
async def refresh_access_token(
    token_payload: TokenPayload = Depends(require_refresh_token),
) -> RefreshResponse:
    """
    Issue a new access token using a valid refresh token.
    The refresh token is validated by the require_refresh_token dependency.
    """
    # Re-resolve user and permissions from DB
    with get_session_ctx() as db:
        user = db.exec(
            select(User).where(User.id == int(token_payload.user_id))
        ).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        permissions: List[str] = []
        if user.role_id:
            role_row = db.exec(select(Role).where(Role.id == user.role_id)).first()
            if role_row and isinstance(role_row.permissions, dict):
                raw = role_row.permissions
                permissions = [k for k, v in raw.items() if v] if isinstance(raw, dict) else list(raw)

    access_token, expires_in = create_access_token(
        user_id=str(user.id),
        email=user.email,
        name=user.name,
        permissions=permissions,
    )
    return RefreshResponse(access_token=access_token, expires_in=expires_in)


@router.post("/logout")
async def logout(
    token_payload: TokenPayload = Depends(require_refresh_token),
) -> Dict[str, str]:
    """Revoke the current session by deleting the Session row."""
    with get_session_ctx() as db:
        sessions = db.exec(
            select(UserSession).where(UserSession.user_id == int(token_payload.user_id))
        ).all()
        for s in sessions:
            db.delete(s)
        db.commit()
    return {"status": "logged out"}

