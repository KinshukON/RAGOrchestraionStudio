"""
Governance models: policies, approval rules, bindings.
Pydantic models for in-memory API; structure is DB-ready for future SQLModel migration.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class GovernancePolicy(BaseModel):
    """Policy set applied to architectures, workflows, or environments."""
    id: str
    name: str
    scope: str  # architecture | workflow | environment
    rules: Dict[str, Any] = Field(default_factory=dict)
    created_by: Optional[str] = None
    created_at: str = ""
    updated_at: str = ""


class ApprovalRule(BaseModel):
    """Approval gateway for publish, promotion, etc."""
    id: str
    name: str
    applies_to: str  # publish_workflow | promote_environment | etc.
    required_roles: List[str] = Field(default_factory=list)
    escalation_path: Dict[str, Any] = Field(default_factory=dict)
    active: bool = True
    created_at: str = ""
    updated_at: str = ""


class GovernanceBinding(BaseModel):
    """Links a policy to a workflow, environment, or architecture type."""
    id: str
    policy_id: str
    workflow_id: Optional[str] = None
    environment_id: Optional[str] = None
    architecture_type: Optional[str] = None
    status: str = "active"  # active | inactive
    created_at: str = ""
    updated_at: str = ""
