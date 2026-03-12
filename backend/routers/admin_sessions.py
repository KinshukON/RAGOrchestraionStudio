from typing import Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models_admin import Session


router = APIRouter()

_SESSIONS: Dict[int, Session] = {}
_ID_COUNTER = 1


class SessionCreate(BaseModel):
    user_id: int
    ip: str | None = None
    user_agent: str | None = None


class SessionRevokeRequest(BaseModel):
    session_ids: List[int] | None = None
    user_id: int | None = None


@router.get("/", response_model=List[Session])
async def list_sessions() -> List[Session]:
    return list(_SESSIONS.values())


@router.post("/", response_model=Session)
async def create_session(payload: SessionCreate) -> Session:
    global _ID_COUNTER
    session = Session(
        id=_ID_COUNTER,
        user_id=payload.user_id,
        ip=payload.ip,
        user_agent=payload.user_agent,
    )
    _SESSIONS[_ID_COUNTER] = session
    _ID_COUNTER += 1
    return session


@router.post("/revoke")
async def revoke_sessions(payload: SessionRevokeRequest) -> dict:
    if payload.session_ids:
        for sid in payload.session_ids:
            session = _SESSIONS.get(sid)
            if session:
                session.status = "revoked"
                _SESSIONS[sid] = session
        return {"status": "revoked_by_ids"}

    if payload.user_id is not None:
        for sid, session in _SESSIONS.items():
            if session.user_id == payload.user_id:
                session.status = "revoked"
                _SESSIONS[sid] = session
        return {"status": "revoked_by_user"}

    raise HTTPException(status_code=400, detail="No session_ids or user_id provided")


