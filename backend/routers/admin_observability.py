from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

from models_admin import AuditLog, ObservabilityEvent


router = APIRouter()

_AUDIT_LOGS: Dict[int, AuditLog] = {}
_EVENTS: Dict[int, ObservabilityEvent] = {}
_AUDIT_ID = 1
_EVENT_ID = 1


class AuditLogFilter(BaseModel):
    user_id: Optional[int] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    since: Optional[datetime] = None
    until: Optional[datetime] = None


@router.get("/audit-logs", response_model=List[AuditLog])
async def list_audit_logs(
    user_id: int | None = None,
    action: str | None = None,
    resource_type: str | None = None,
) -> List[AuditLog]:
    results = list(_AUDIT_LOGS.values())
    if user_id is not None:
        results = [log for log in results if log.user_id == user_id]
    if action is not None:
        results = [log for log in results if log.action == action]
    if resource_type is not None:
        results = [log for log in results if log.resource_type == resource_type]
    return results


@router.get("/metrics")
async def get_observability_metrics() -> dict:
    return {
        "total_audit_logs": len(_AUDIT_LOGS),
        "total_events": len(_EVENTS),
    }


def log_action(
    *,
    user_id: int | None,
    session_id: int | None,
    action: str,
    resource_type: str,
    resource_id: str,
    metadata: dict | None = None,
    ip: str | None = None,
) -> None:
    global _AUDIT_ID
    log = AuditLog(
        id=_AUDIT_ID,
        user_id=user_id,
        session_id=session_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata=metadata or {},
        ip=ip,
    )
    _AUDIT_LOGS[_AUDIT_ID] = log
    _AUDIT_ID += 1


