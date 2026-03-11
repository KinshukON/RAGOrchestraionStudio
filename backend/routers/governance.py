from typing import List, Dict, Any

from fastapi import APIRouter
from pydantic import BaseModel


class ApprovalWorkflow(BaseModel):
    id: str
    name: str
    steps: List[Dict[str, Any]]


class AuditEvent(BaseModel):
    id: str
    actor_id: str
    action: str
    timestamp: str
    metadata: Dict[str, Any]


router = APIRouter()


@router.get("/approvals", response_model=List[ApprovalWorkflow])
async def list_approval_workflows() -> List[ApprovalWorkflow]:
    return []


@router.get("/audit-logs", response_model=List[AuditEvent])
async def list_audit_logs() -> List[AuditEvent]:
    return []

