from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter
from pydantic import BaseModel
from sqlmodel import select

from db import get_session
from models_admin import AuditLog, ObservabilityEvent

router = APIRouter()


class AuditLogOut(BaseModel):
    id: int
    timestamp: datetime
    user_id: int | None
    session_id: int | None
    action: str
    resource_type: str
    resource_id: str
    event_data: Dict[str, Any]
    ip: str | None


class ObservabilityEventOut(BaseModel):
    id: int
    timestamp: datetime
    user_id: int | None
    session_id: int | None
    category: str
    name: str
    value: float | None
    event_data: Dict[str, Any]


class AuditLogCreate(BaseModel):
    user_id: int | None = None
    session_id: int | None = None
    action: str
    resource_type: str
    resource_id: str
    event_data: Dict[str, Any] = {}
    ip: str | None = None


class ObservabilityEventCreate(BaseModel):
    user_id: int | None = None
    session_id: int | None = None
    category: str
    name: str
    value: float | None = None
    event_data: Dict[str, Any] = {}


@router.get("/audit-logs", response_model=List[AuditLogOut])
async def list_audit_logs(limit: int = 100) -> List[AuditLogOut]:
    with get_session() as db:
        rows = list(db.exec(select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)))  # type: ignore[arg-type]
    return [
        AuditLogOut(
            id=r.id or 0,
            timestamp=r.timestamp,
            user_id=r.user_id,
            session_id=r.session_id,
            action=r.action,
            resource_type=r.resource_type,
            resource_id=r.resource_id,
            event_data=r.event_data,
            ip=r.ip,
        )
        for r in rows
    ]


@router.post("/audit-logs", response_model=AuditLogOut)
async def create_audit_log(payload: AuditLogCreate) -> AuditLogOut:
    with get_session() as db:
        log = AuditLog(**payload.model_dump())
        db.add(log)
        db.commit()
        db.refresh(log)
        return AuditLogOut(
            id=log.id or 0,
            timestamp=log.timestamp,
            user_id=log.user_id,
            session_id=log.session_id,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            event_data=log.event_data,
            ip=log.ip,
        )


@router.get("/events", response_model=List[ObservabilityEventOut])
async def list_events(category: str | None = None, limit: int = 100) -> List[ObservabilityEventOut]:
    with get_session() as db:
        stmt = select(ObservabilityEvent).order_by(ObservabilityEvent.timestamp.desc()).limit(limit)  # type: ignore[arg-type]
        if category:
            stmt = stmt.where(ObservabilityEvent.category == category)
        rows = list(db.exec(stmt))
    return [
        ObservabilityEventOut(
            id=r.id or 0,
            timestamp=r.timestamp,
            user_id=r.user_id,
            session_id=r.session_id,
            category=r.category,
            name=r.name,
            value=r.value,
            event_data=r.event_data,
        )
        for r in rows
    ]


@router.post("/events", response_model=ObservabilityEventOut)
async def create_event(payload: ObservabilityEventCreate) -> ObservabilityEventOut:
    with get_session() as db:
        event = ObservabilityEvent(**payload.model_dump())
        db.add(event)
        db.commit()
        db.refresh(event)
        return ObservabilityEventOut(
            id=event.id or 0,
            timestamp=event.timestamp,
            user_id=event.user_id,
            session_id=event.session_id,
            category=event.category,
            name=event.name,
            value=event.value,
            metadata=event.metadata,
        )
