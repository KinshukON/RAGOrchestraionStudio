from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from db import get_session
from models_admin import Session as SessionModel

router = APIRouter()


class SessionCreate(BaseModel):
    user_id: int
    ip: str | None = None
    user_agent: str | None = None


class SessionOut(BaseModel):
    id: int
    user_id: int
    created_at: datetime
    last_activity_at: datetime
    ip: str | None
    user_agent: str | None
    status: str


@router.get("/", response_model=List[SessionOut])
async def list_sessions(user_id: int | None = None) -> List[SessionOut]:
    """List all sessions, optionally filtered by user_id."""
    with get_session() as db:
        stmt = select(SessionModel)
        if user_id is not None:
            stmt = stmt.where(SessionModel.user_id == user_id)
        rows = list(db.exec(stmt))
    return [
        SessionOut(
            id=r.id or 0,
            user_id=r.user_id,
            created_at=r.created_at,
            last_activity_at=r.last_activity_at,
            ip=r.ip,
            user_agent=r.user_agent,
            status=r.status,
        )
        for r in rows
    ]


@router.post("/", response_model=SessionOut)
async def create_session(payload: SessionCreate) -> SessionOut:
    """Create a new active session for a user."""
    with get_session() as db:
        s = SessionModel(
            user_id=payload.user_id,
            ip=payload.ip,
            user_agent=payload.user_agent,
            status="active",
        )
        db.add(s)
        db.commit()
        db.refresh(s)
        return SessionOut(
            id=s.id or 0,
            user_id=s.user_id,
            created_at=s.created_at,
            last_activity_at=s.last_activity_at,
            ip=s.ip,
            user_agent=s.user_agent,
            status=s.status,
        )


@router.patch("/{session_id}/revoke", response_model=SessionOut)
async def revoke_session(session_id: int) -> SessionOut:
    """Revoke a session by id."""
    with get_session() as db:
        s = db.get(SessionModel, session_id)
        if not s:
            raise HTTPException(status_code=404, detail="Session not found")
        s.status = "revoked"
        db.add(s)
        db.commit()
        db.refresh(s)
        return SessionOut(
            id=s.id or 0,
            user_id=s.user_id,
            created_at=s.created_at,
            last_activity_at=s.last_activity_at,
            ip=s.ip,
            user_agent=s.user_agent,
            status=s.status,
        )


@router.delete("/by-user/{user_id}", response_model=dict)
async def revoke_user_sessions(user_id: int) -> dict:
    """Revoke all active sessions for a given user."""
    with get_session() as db:
        stmt = select(SessionModel).where(
            SessionModel.user_id == user_id,
            SessionModel.status == "active",
        )
        sessions = list(db.exec(stmt))
        count = 0
        for s in sessions:
            s.status = "revoked"
            db.add(s)
            count += 1
        db.commit()
    return {"revoked": count}
