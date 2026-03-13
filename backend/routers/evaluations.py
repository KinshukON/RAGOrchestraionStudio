"""
Evaluations API: test cases and evaluation runs.
In-memory store for now; design is DB-ready for future persistence.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()

# In-memory store (replace with repository when DB is added)
_test_cases: List[Dict[str, Any]] = []


class TestCaseCreate(BaseModel):
    workflow_id: str
    environment_id: str
    query: str
    strategy_id: str
    expected_answer: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None


class TestCaseResponse(BaseModel):
    id: str
    workflow_id: str
    environment_id: str
    query: str
    strategy_id: str
    expected_answer: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    created_at: str


@router.post("/test-cases", response_model=TestCaseResponse)
def create_test_case(payload: TestCaseCreate) -> TestCaseResponse:
    """Save a query/strategy/answer as a test case for later evaluation runs."""
    id_ = str(uuid4())
    now = datetime.utcnow().isoformat() + "Z"
    record = {
        "id": id_,
        "workflow_id": payload.workflow_id,
        "environment_id": payload.environment_id,
        "query": payload.query,
        "strategy_id": payload.strategy_id,
        "expected_answer": payload.expected_answer,
        "parameters": payload.parameters or {},
        "created_at": now,
    }
    _test_cases.append(record)
    return TestCaseResponse(**record)


@router.get("/test-cases", response_model=List[TestCaseResponse])
def list_test_cases(
    workflow_id: Optional[str] = None,
    environment_id: Optional[str] = None,
) -> List[TestCaseResponse]:
    """List saved test cases, optionally filtered by workflow or environment."""
    out = list(_test_cases)
    if workflow_id:
        out = [t for t in out if t["workflow_id"] == workflow_id]
    if environment_id:
        out = [t for t in out if t["environment_id"] == environment_id]
    return [TestCaseResponse(**t) for t in out]
