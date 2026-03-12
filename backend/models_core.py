from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    business_domain: str
    use_case_description: str
    deployment_status: str = "draft"
    selected_architecture_type: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Integration(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")
    external_id: str  # matches the id used in the existing IntegrationConfig API
    name: str
    provider_type: str
    credentials_reference: str
    environment_mapping: dict = Field(default_factory=dict)
    default_usage_policies: dict = Field(default_factory=dict)
    reusable: bool = True
    health_status: str | None = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Environment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")
    external_id: str  # matches the id used in the EnvironmentConfig API
    name: str
    description: str
    integration_bindings: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class WorkflowRun(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    workflow_id: str
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")
    environment_id: Optional[int] = Field(default=None, foreign_key="environment.id")
    status: str = "pending"
    input_payload: dict = Field(default_factory=dict)
    output_payload: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class TaskExecution(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(foreign_key="workflowrun.id")
    node_id: str
    node_type: str
    status: str = "pending"
    input_payload: dict = Field(default_factory=dict)
    output_payload: dict = Field(default_factory=dict)
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


