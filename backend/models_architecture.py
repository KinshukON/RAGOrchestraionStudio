from datetime import datetime
from typing import Optional, Literal

from sqlalchemy import Column, JSON
from sqlmodel import SQLModel, Field


# Used in Pydantic response schemas – NOT attached to SQLModel table columns
ArchitectureType = Literal["vector", "vectorless", "graph", "temporal", "hybrid", "custom"]


class ArchitectureTemplate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(index=True, unique=True)
    type: str  # one of ArchitectureType values
    title: str
    short_definition: str
    when_to_use: str
    strengths: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    tradeoffs: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    typical_backends: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DesignSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    architecture_type: str  # one of ArchitectureType values
    project_id: Optional[int] = None
    status: str = "draft"
    wizard_state: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    derived_architecture_definition: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class WorkflowDefinitionRecord(SQLModel, table=True):
    """Persisted workflow definition. API contract remains WorkflowDefinition (Pydantic)."""
    workflow_id: str = Field(primary_key=True)
    project_id: str = ""
    design_session_id: Optional[int] = Field(default=None, foreign_key="designsession.id")
    architecture_type: str = ""
    name: str = ""
    description: str = ""
    version: str = "1"
    status: str = "draft"  # draft | active | deprecated
    definition: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))  # nodes, edges, and any extra
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
