"""Cost & ROI SQLModel tables."""
from datetime import datetime
from typing import Optional

from sqlalchemy import Column, JSON
from sqlmodel import SQLModel, Field


class CostProfile(SQLModel, table=True):
    """Per-architecture cost defaults — seeded on first request, admin-editable."""
    id: Optional[int] = Field(default=None, primary_key=True)
    architecture_type: str = Field(index=True, unique=True)
    label: str = ""
    default_top_k: int = 8
    default_chunk_size: int = 512
    latency_estimate_ms: int = 500
    latency_source: str = ""
    embedding_cost_per_1m: float = 0.13
    llm_input_cost_per_1m: float = 2.50
    llm_output_cost_per_1m: float = 10.00
    # Layer 1 additions — engineering economics
    reranker_cost_per_1m: float = 0.0           # reranker inference cost
    graph_traversal_cost_per_1m: float = 0.0    # graph DB query cost
    index_storage_cost_monthly: float = 0.0     # vector/index storage $/mo
    infra_base_cost_monthly: float = 0.0        # base infra (compute, networking)
    # Layer 2 — business impact defaults (per-architecture)
    ticket_deflection_rate: float = 0.0         # 0-1, fraction of tickets deflected
    compliance_hours_saved_monthly: float = 0.0
    escalation_reduction_rate: float = 0.0      # 0-1
    failed_answer_reduction_rate: float = 0.0   # 0-1
    search_effort_reduction_rate: float = 0.0   # 0-1
    analyst_hours_saved_monthly: float = 40.0
    notes: str = ""
    benchmark_sources: list = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CostScenario(SQLModel, table=True):
    """Saved user calculation — persists inputs + computed results."""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: str = ""
    name: str = ""
    architecture_type: str = ""
    inputs: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    results: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow)
