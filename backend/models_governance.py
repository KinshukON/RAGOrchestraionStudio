"""
Governance models: policies, approval rules, bindings.
SQLModel tables — persisted in PostgreSQL via Alembic migrations.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


class GovernancePolicy(SQLModel, table=True):
    """Policy set applied to architectures, workflows, or environments."""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    scope: str = "workflow"  # architecture | workflow | environment
    rules: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    created_by: Optional[int] = None  # user.id reference
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ApprovalRule(SQLModel, table=True):
    """Approval gateway for publish, promotion, etc."""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    applies_to: str = "publish_workflow"  # publish_workflow | promote_environment | etc.
    required_roles: list = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    escalation_path: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class GovernanceBinding(SQLModel, table=True):
    """Links a policy to a workflow, environment, or architecture type."""
    id: Optional[int] = Field(default=None, primary_key=True)
    policy_id: int  # FK to governancepolicy.id
    workflow_id: Optional[str] = None
    environment_id: Optional[str] = None
    architecture_type: Optional[str] = None
    status: str = "active"  # active | inactive
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
