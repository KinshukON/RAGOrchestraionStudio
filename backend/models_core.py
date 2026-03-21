from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


class Project(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    business_domain: str
    use_case_description: str
    deployment_status: str = "draft"
    selected_architecture_type: str
    owners: list = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Integration(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")
    external_id: str = ""  # matches the id used in the existing IntegrationConfig API
    name: str
    provider_type: str
    credentials_reference: str = ""
    environment_mapping: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    default_usage_policies: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    reusable: bool = True
    health_status: str | None = None
    last_tested_at: Optional[datetime] = None
    # Security & sharing
    owner_user_id: Optional[int] = None  # user.id who created/owns this integration
    sharing_scope: str = "organization"  # private | team | organization
    shared_with_team_ids: list = Field(default_factory=list, sa_column=Column("shared_with_team_ids", JSON, nullable=False, server_default="[]"))
    credential_encrypted: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)



class Environment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")
    external_id: str = ""  # matches the id used in the EnvironmentConfig API
    name: str
    description: str = ""
    integration_bindings: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    runtime_profile: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    promotion_status: str = "draft"  # draft | promoted | promoted_to_staging | promoted_to_prod
    approval_state: str | None = None  # pending | approved | rejected
    health_status: str | None = None
    drift_detected: bool = False
    drift_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class WorkflowDefinition(SQLModel, table=True):
    """Main workflow definition persisted in core DB for the workflow builder."""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str = ""
    architecture_type: str
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")
    version: str = "1.0.0"
    status: str = "draft"  # draft | test-ready | evaluated | certified | published | deprecated | archived
    nodes: list = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    edges: list = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    is_active: bool = True
    drift_detected: bool = False
    drift_reason: Optional[str] = None
    
    # AOS Cross-Platform Governance Metadata
    tenant_id: str = "default"
    workspace_id: str = "default"
    environment: str = "default"
    certification_status: str = "uncertified"  # uncertified | certified | rejected
    evaluation_status: str = "pending"         # pending | passing | failing
    freshness_status: str = "stale"            # stale | fresh
    
    tags: list = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    use_case_metadata: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    created_by: str = "system"
    updated_by: str = "system"
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# === Cross-Platform Asset Models (AOS Interoperability) ===

class AssetBase(SQLModel):
    """Base class providing common tenant, identity, and lifecycle tracking for shared RAG assets."""
    tenant_id: str = "default"
    workspace_id: str = "default"
    environment: str = "default"
    version: str = "1.0.0"
    status: str = "draft"  # draft | test-ready | evaluated | certified | published | deprecated | archived
    tags: list = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    use_case_metadata: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    created_by: str = "system"
    updated_by: str = "system"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class KnowledgeBase(AssetBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str = ""
    certification_status: str = "uncertified"
    freshness_status: str = "stale"

class Corpus(AssetBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    knowledge_base_id: Optional[int] = Field(default=None, foreign_key="knowledgebase.id")
    name: str
    description: str = ""
    source_type: str
    document_count: int = 0
    freshness_status: str = "stale"

class RerankerProfile(AssetBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str = ""
    provider: str
    model_identifier: str
    top_k_default: int = 5

class EvaluationProfile(AssetBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: str = ""
    metrics: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    thresholds: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))

class CertificationRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    asset_id: str
    asset_version: str = "1.0.0"
    asset_type: str  # workflow | corpus | knowledge_base | reranker_profile
    certified_by: str
    certification_level: str
    eval_profile_used: Optional[str] = None
    notes: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class IngestionJob(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    corpus_id: int = Field(foreign_key="corpus.id")
    tenant_id: str = "default"
    status: str = "pending" # pending | running | success | failed
    processed_records: int = 0
    error_log: str = ""
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class IndexJob(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    corpus_id: int = Field(foreign_key="corpus.id")
    tenant_id: str = "default"
    status: str = "pending"
    vector_count: int = 0
    error_log: str = ""
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WorkflowRun(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    workflow_id: str
    project_id: Optional[int] = Field(default=None, foreign_key="project.id")
    environment_id: Optional[int] = Field(default=None, foreign_key="environment.id")
    status: str = "pending"
    input_payload: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    output_payload: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class TaskExecution(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(foreign_key="workflowrun.id")
    node_id: str
    node_type: str
    status: str = "pending"
    input_payload: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    output_payload: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
