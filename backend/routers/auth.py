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

