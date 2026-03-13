"""
Observability API: workflow runs, run detail, task timeline, and audit integration.
Reads from the same WorkflowRun and TaskExecution tables used by the workflows router.
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from db import get_session
from models_core import TaskExecution, WorkflowRun

router = APIRouter()


class RunSummary(BaseModel):
    id: int
    workflow_id: str
    status: str
    created_at: str
    finished_at: Optional[str]
    architecture_type: Optional[str] = None
    strategy_id: Optional[str] = None
    environment_external_id: Optional[str] = None
    is_simulated: bool = False
    metrics: Dict[str, Any] = {}


class RunDetail(BaseModel):
    id: int
    workflow_id: str
    status: str
    created_at: str
    started_at: Optional[str]
    finished_at: Optional[str]
    input_payload: Dict[str, Any]
    output_payload: Dict[str, Any]
    architecture_type: Optional[str] = None
    strategy_id: Optional[str] = None
    environment_external_id: Optional[str] = None
    is_simulated: bool = False
    metrics: Dict[str, Any] = {}


class TaskSummary(BaseModel):
    id: int
    run_id: int
    node_id: str
    node_type: str
    status: str
    started_at: Optional[str]
    finished_at: Optional[str]
    step_index: Optional[int]
    error: Optional[str]
    trace_metadata: Dict[str, Any]


def _get(r: WorkflowRun, attr: str, default: Any = None) -> Any:
    """Safe get for optional columns that may not exist on older DB schema."""
    return getattr(r, attr, default)


def _run_to_summary(r: WorkflowRun) -> RunSummary:
    return RunSummary(
        id=r.id or 0,
        workflow_id=r.workflow_id,
        status=r.status,
        created_at=r.created_at.isoformat(),
        finished_at=r.finished_at.isoformat() if r.finished_at else None,
        architecture_type=_get(r, "architecture_type"),
        strategy_id=_get(r, "strategy_id"),
        environment_external_id=_get(r, "environment_external_id"),
        is_simulated=_get(r, "is_simulated", False) or False,
        metrics=_get(r, "metrics") or {},
    )


def _run_to_detail(r: WorkflowRun) -> RunDetail:
    return RunDetail(
        id=r.id or 0,
        workflow_id=r.workflow_id,
        status=r.status,
        created_at=r.created_at.isoformat(),
        started_at=r.started_at.isoformat() if r.started_at else None,
        finished_at=r.finished_at.isoformat() if r.finished_at else None,
        input_payload=r.input_payload or {},
        output_payload=r.output_payload or {},
        architecture_type=_get(r, "architecture_type"),
        strategy_id=_get(r, "strategy_id"),
        environment_external_id=_get(r, "environment_external_id"),
        is_simulated=_get(r, "is_simulated", False) or False,
        metrics=_get(r, "metrics") or {},
    )


@router.get("/runs", response_model=List[RunSummary])
async def list_runs(
    workflow_id: Optional[str] = None,
    status: Optional[str] = None,
    is_simulated: Optional[bool] = None,
) -> List[RunSummary]:
    with get_session() as session:
        runs = list(session.exec(select(WorkflowRun)))
    if workflow_id:
        runs = [r for r in runs if r.workflow_id == workflow_id]
    if status:
        runs = [r for r in runs if r.status == status]
    if is_simulated is not None:
        runs = [r for r in runs if (_get(r, "is_simulated", False) or False) == is_simulated]
    runs.sort(key=lambda r: r.created_at, reverse=True)
    return [_run_to_summary(r) for r in runs]


@router.get("/runs/{run_id}", response_model=RunDetail)
async def get_run(run_id: int) -> RunDetail:
    with get_session() as session:
        run = session.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return _run_to_detail(run)


@router.get("/runs/{run_id}/tasks", response_model=List[TaskSummary])
async def list_run_tasks(run_id: int) -> List[TaskSummary]:
    with get_session() as session:
        run = session.get(WorkflowRun, run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        tasks = list(session.exec(select(TaskExecution).where(TaskExecution.run_id == run_id)))
    def _task_meta(te: TaskExecution) -> dict:
        return getattr(te, "trace_metadata", None) or {}

    tasks.sort(key=lambda t: (getattr(t, "step_index", None) if getattr(t, "step_index", None) is not None else 999, t.id or 0))
    return [
        TaskSummary(
            id=t.id or 0,
            run_id=t.run_id,
            node_id=t.node_id,
            node_type=t.node_type,
            status=t.status,
            started_at=t.started_at.isoformat() if t.started_at else None,
            finished_at=t.finished_at.isoformat() if t.finished_at else None,
            step_index=getattr(t, "step_index", None),
            error=t.error,
            trace_metadata=_task_meta(t),
        )
        for t in tasks
    ]
