import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import jwt
import requests
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field


GOOGLE_TOKENINFO_ENDPOINT = "https://oauth2.googleapis.com/tokeninfo"


class GoogleSignInRequest(BaseModel):
    id_token: str = Field(..., description="Google ID token from Google Identity Services")


class AuthUser(BaseModel):
    id: str
    name: str
    email: str
    picture: str | None = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthUser


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

    # Optional audience check to ensure the token was issued for this app.
    expected_aud = os.getenv("GOOGLE_CLIENT_ID")
    if expected_aud and payload.get("aud") != expected_aud:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token audience does not match configured client",
        )

    return payload


def _create_access_token(user: AuthUser) -> tuple[str, int]:
    """Create a short-lived JWT for the frontend to use."""
    secret_key = os.getenv("AUTH_JWT_SECRET", "change-me-in-production")
    algorithm = os.getenv("AUTH_JWT_ALGORITHM", "HS256")
    minutes = int(os.getenv("AUTH_ACCESS_TOKEN_MINUTES", "15"))

    now = datetime.now(timezone.utc)
    expires_delta = timedelta(minutes=minutes)
    expire = now + expires_delta

    claims: Dict[str, Any] = {
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "exp": expire,
        "iat": now,
    }

    token = jwt.encode(claims, secret_key, algorithm=algorithm)
    return token, int(expires_delta.total_seconds())


@router.post("/google", response_model=AuthResponse)
async def sign_in_with_google(payload: GoogleSignInRequest) -> AuthResponse:
    """
    Exchange a Google ID token for an application access token.

    The frontend obtains the ID token via Google Identity Services and posts it here.
    """
    google_payload = _verify_google_id_token(payload.id_token)

    user = AuthUser(
        id=google_payload["sub"],
        email=google_payload.get("email", ""),
        name=google_payload.get("name") or google_payload.get("email", ""),
        picture=google_payload.get("picture"),
    )

    access_token, expires_in = _create_access_token(user)

    return AuthResponse(
        access_token=access_token,
        expires_in=expires_in,
        user=user,
    )

