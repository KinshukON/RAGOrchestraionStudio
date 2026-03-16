"""
Evaluation models: benchmark queries and test cases.
SQLModel tables — persisted in PostgreSQL via Alembic migrations.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


class BenchmarkQuery(SQLModel, table=True):
    """Benchmark query with expected answer, rubric, and per-strategy scores."""
    id: Optional[int] = Field(default=None, primary_key=True)
    external_id: str = Field(index=True, unique=True)  # e.g. "bq-seed-001"
    query: str
    expected_answer: str = ""
    expected_evidence: list = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    rubric: str = ""
    scenario_tag: str = "semantic"
    difficulty: str = "medium"
    scores: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    human_rating: Optional[int] = None
    status: str = "pending"  # pending | scored
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class EvaluationTestCase(SQLModel, table=True):
    """Test case created by a user in the evaluation harness."""
    id: Optional[int] = Field(default=None, primary_key=True)
    external_id: str = Field(index=True, unique=True)  # UUID string
    workflow_id: str
    environment_id: str
    query: str
    strategy_id: str
    expected_answer: Optional[str] = None
    parameters: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow)
