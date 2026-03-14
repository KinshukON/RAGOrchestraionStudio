from typing import List, Literal, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import select

from auth_middleware import TokenPayload, optional_auth, require_auth

from db import get_session
from models_core import WorkflowRun, TaskExecution
from repositories import WorkflowRepository


NodeType = Literal[
    "input_query",
    "query_classifier",
    "intent_detector",
    "embedding_generator",
    "vector_retriever",
    "lexical_retriever",
    "metadata_filter",
    "sql_retriever",
    "graph_retriever",
    "temporal_filter",
    "conflict_resolver",
    "reranker",
    "context_assembler",
    "prompt_constructor",
    "llm_answer_generator",
    "evaluator",
    "source_citation_builder",
    "guardrail",
    "fallback_route",
    "output_formatter",
]


class WorkflowNode(BaseModel):
    id: str
    type: NodeType
    name: str
    config: Dict[str, Any] = Field(default_factory=dict)
    position: Dict[str, float] = Field(default_factory=dict)


class WorkflowEdge(BaseModel):
    id: str
    source: str
    target: str
    condition: Optional[str] = None


class WorkflowDefinition(BaseModel):
    id: str
    project_id: str
    name: str
    description: str
    version: str
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
    is_active: bool = False
    architecture_type: str


router = APIRouter()
_workflow_repo = WorkflowRepository()


class WorkflowSummary(BaseModel):
    id: str
    name: str
    description: str
    version: str
    architecture_type: str
    is_active: bool


# Defined here (before the /runs route) so the route decorator can reference it
class WorkflowRunSummary(BaseModel):
    id: int
    workflow_id: str
    status: str
    created_at: str
    finished_at: str | None = None


@router.get("/", response_model=List[WorkflowDefinition])
async def list_workflows() -> List[WorkflowDefinition]:
    dicts = _workflow_repo.list_all()
    return [WorkflowDefinition.model_validate(d) for d in dicts]


@router.get("/by-architecture/{architecture_type}", response_model=List[WorkflowSummary])
async def list_workflows_by_architecture(architecture_type: str) -> List[WorkflowSummary]:
    dicts = _workflow_repo.list_by_architecture(architecture_type)
    return [
        WorkflowSummary(
            id=d["id"],
            name=d["name"],
            description=d["description"],
            version=d["version"],
            architecture_type=d["architecture_type"],
            is_active=d["is_active"],
        )
        for d in dicts
    ]


# ── Run History (must be registered BEFORE /{workflow_id} to avoid shadowing) ───
@router.get("/runs", response_model=List[WorkflowRunSummary])
async def list_workflow_runs() -> List[WorkflowRunSummary]:
    import traceback as _tb
    try:
        with get_session() as session:
            runs = list(session.exec(select(WorkflowRun)))
        summaries: List[WorkflowRunSummary] = []
        for run in runs:
            summaries.append(
                WorkflowRunSummary(
                    id=run.id or 0,
                    workflow_id=run.workflow_id,
                    status=run.status,
                    created_at=run.created_at.isoformat(),
                    finished_at=run.finished_at.isoformat() if run.finished_at else None,
                )
            )
        summaries.sort(key=lambda r: r.created_at, reverse=True)
        return summaries
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Runs error: {type(exc).__name__}: {exc}\n\n{_tb.format_exc()}",
        ) from exc


@router.get("/{workflow_id}", response_model=WorkflowDefinition)
async def get_workflow(workflow_id: str) -> WorkflowDefinition:
    d = _workflow_repo.get(workflow_id)
    if not d:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return WorkflowDefinition.model_validate(d)


@router.get("/{workflow_id}/summary", response_model=WorkflowSummary)
async def get_workflow_summary(workflow_id: str) -> WorkflowSummary:
    d = _workflow_repo.get(workflow_id)
    if not d:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return WorkflowSummary(
        id=d["id"],
        name=d["name"],
        description=d["description"],
        version=d["version"],
        architecture_type=d["architecture_type"],
        is_active=d["is_active"],
    )


@router.post("/", response_model=WorkflowDefinition)
async def create_workflow(definition: WorkflowDefinition) -> WorkflowDefinition:
    try:
        d = _workflow_repo.create(definition.model_dump())
        return WorkflowDefinition.model_validate(d)
    except ValueError as e:
        if "already exists" in str(e):
            raise HTTPException(status_code=400, detail="Workflow with this id already exists")
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{workflow_id}", response_model=WorkflowDefinition)
async def update_workflow(workflow_id: str, definition: WorkflowDefinition) -> WorkflowDefinition:
    try:
        d = _workflow_repo.update(workflow_id, definition.model_dump())
        return WorkflowDefinition.model_validate(d)
    except ValueError as e:
        if "not found" in str(e):
            raise HTTPException(status_code=404, detail="Workflow not found")
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str) -> Dict[str, str]:
    try:
        _workflow_repo.delete(workflow_id)
        return {"status": "deleted"}
    except ValueError as e:
        if "not found" in str(e):
            raise HTTPException(status_code=404, detail="Workflow not found")
        raise HTTPException(status_code=400, detail=str(e))


class WorkflowSimulationRequest(BaseModel):
    project_id: str
    environment_id: str
    query: str


class WorkflowSimulationTrace(BaseModel):
    retrieved_sources: List[Dict[str, Any]]
    retrieval_path: List[str]
    vector_hits: List[Dict[str, Any]]
    metadata_matches: List[Dict[str, Any]]
    graph_traversal: List[Dict[str, Any]]
    temporal_filters: List[Dict[str, Any]]
    reranking_decisions: List[Dict[str, Any]]
    final_prompt_context: str
    model_answer: str
    grounded_citations: List[Dict[str, Any]]
    latency_ms: float
    confidence_score: float
    hallucination_risk: str


class MultiStrategySimulationRequest(WorkflowSimulationRequest):
    strategies: List[str] | None = None
    parameters: Dict[str, Any] | None = None


class StrategyTrace(BaseModel):
    strategy_id: str
    trace: WorkflowSimulationTrace


class MultiStrategySimulationTrace(BaseModel):
    results: List[StrategyTrace]



# ── Real RAG Run Endpoints ────────────────────────────────────────────────────

class WorkflowRunRequest(BaseModel):
    """Request body for a real RAG execution run."""
    query: str
    project_id: str = ""
    environment_id: str = ""
    architecture_type: str = "vector"
    parameters: Dict[str, Any] = Field(default_factory=dict)


class WorkflowRunResponse(BaseModel):
    """Full trace returned by a real RAG run."""
    run_id: int
    retrieved_sources: List[Dict[str, Any]]
    retrieval_path: List[str]
    vector_hits: List[Dict[str, Any]]
    metadata_matches: List[Dict[str, Any]]
    graph_traversal: List[Dict[str, Any]]
    temporal_filters: List[Dict[str, Any]]
    reranking_decisions: List[Dict[str, Any]]
    final_prompt_context: str
    model_answer: str
    grounded_citations: List[Dict[str, Any]]
    latency_ms: float
    confidence_score: float
    hallucination_risk: str
    is_simulated: bool
    model_used: str
    input_tokens: int
    output_tokens: int
    spans: List[Dict[str, Any]]


class MultiRunRequest(BaseModel):
    query: str
    project_id: str = ""
    environment_id: str = ""
    strategies: List[str] = Field(default_factory=lambda: ["vector", "hybrid", "graph"])
    parameters: Dict[str, Any] = Field(default_factory=dict)


class StrategyRunResult(BaseModel):
    strategy_id: str
    trace: WorkflowRunResponse


class MultiRunResponse(BaseModel):
    results: List[StrategyRunResult]


@router.post("/{workflow_id}/run", response_model=WorkflowRunResponse)
async def run_workflow(
    workflow_id: str,
    payload: WorkflowRunRequest,
    current_user: TokenPayload = Depends(require_auth),
) -> WorkflowRunResponse:
    """
    Execute a real RAG pipeline run for the given workflow.
    Routes through architecture-specific connectors (embed → retrieve → rerank → generate).
    Falls back gracefully to simulated data when API keys are not configured.
    """
    from rag_engine import run_rag_pipeline
    from datetime import datetime

    # Determine architecture type: prefer payload, fall back to workflow definition
    arch_type = payload.architecture_type
    wf_dict = _workflow_repo.get(workflow_id)
    if not arch_type and wf_dict:
        arch_type = wf_dict.get("architecture_type", "vector")
    arch_type = arch_type or "vector"

    # Persist run row (status=running)
    with get_session() as session:
        run = WorkflowRun(
            workflow_id=workflow_id,
            status="running",
            input_payload=payload.model_dump(),
        )
        session.add(run)
        session.commit()
        session.refresh(run)
        run_id = run.id or 0

    try:
        result = await run_rag_pipeline(
            query=payload.query,
            architecture_type=arch_type,
            parameters=payload.parameters,
        )

        trace = result.as_trace_dict()

        # Persist task execution + update run status
        with get_session() as session:
            task = TaskExecution(
                run_id=run_id,
                node_id="rag_pipeline",
                node_type="full_pipeline",
                status="succeeded",
                input_payload=payload.model_dump(),
                output_payload=trace,
                started_at=datetime.utcnow(),
                finished_at=datetime.utcnow(),
            )
            session.add(task)
            # Update run
            existing_run = session.get(WorkflowRun, run_id)
            if existing_run:
                existing_run.status = "succeeded"
                existing_run.output_payload = {"answer": result.answer}
                existing_run.finished_at = datetime.utcnow()
                session.add(existing_run)
            session.commit()

        return WorkflowRunResponse(run_id=run_id, **trace)

    except Exception as exc:
        # Mark run as failed
        with get_session() as session:
            existing_run = session.get(WorkflowRun, run_id)
            if existing_run:
                existing_run.status = "failed"
                existing_run.output_payload = {"error": str(exc)}
                existing_run.finished_at = datetime.utcnow()
                session.add(existing_run)
            session.commit()
        raise HTTPException(status_code=500, detail=f"RAG pipeline error: {exc}")


@router.post("/{workflow_id}/run-multi", response_model=MultiRunResponse)
async def run_workflow_multi(
    workflow_id: str,
    payload: MultiRunRequest,
    current_user: TokenPayload = Depends(require_auth),
) -> MultiRunResponse:
    """
    Run the same query through multiple architecture strategies for side-by-side comparison.
    Falls back gracefully to simulated data for strategies without configured connectors.
    """
    import asyncio

    async def run_one(strategy: str) -> StrategyRunResult:
        req = WorkflowRunRequest(
            query=payload.query,
            project_id=payload.project_id,
            environment_id=payload.environment_id,
            architecture_type=strategy,
            parameters=payload.parameters,
        )
        trace = await run_workflow(workflow_id, req)
        return StrategyRunResult(strategy_id=strategy, trace=trace)

    # Run all strategies concurrently
    tasks = [run_one(s) for s in payload.strategies]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    strategy_results: List[StrategyRunResult] = []
    for i, res in enumerate(results):
        if isinstance(res, Exception):
            # Create a minimal error result for failed strategies
            strategy_results.append(
                StrategyRunResult(
                    strategy_id=payload.strategies[i],
                    trace=WorkflowRunResponse(
                        run_id=0,
                        retrieved_sources=[],
                        retrieval_path=[],
                        vector_hits=[],
                        metadata_matches=[],
                        graph_traversal=[],
                        temporal_filters=[],
                        reranking_decisions=[],
                        final_prompt_context="",
                        model_answer=f"[Error: {res}]",
                        grounded_citations=[],
                        latency_ms=0,
                        confidence_score=0,
                        hallucination_risk="unknown",
                        is_simulated=True,
                        model_used="error",
                        input_tokens=0,
                        output_tokens=0,
                        spans=[],
                    ),
                )
            )
        else:
            strategy_results.append(res)

    return MultiRunResponse(results=strategy_results)


# ── Backwards-compatible simulate aliases ─────────────────────────────────────

@router.post("/{workflow_id}/simulate", response_model=WorkflowSimulationTrace,
             deprecated=True, description="Deprecated: use /run instead")
async def simulate_workflow(
    workflow_id: str, payload: WorkflowSimulationRequest
) -> WorkflowSimulationTrace:
    """Backwards-compatible simulate alias — delegates to the real run endpoint."""
    run_resp = await run_workflow(
        workflow_id,
        WorkflowRunRequest(
            query=payload.query,
            project_id=payload.project_id,
            environment_id=payload.environment_id,
            architecture_type="vector",
        ),
    )
    return WorkflowSimulationTrace(
        retrieved_sources=run_resp.retrieved_sources,
        retrieval_path=run_resp.retrieval_path,
        vector_hits=run_resp.vector_hits,
        metadata_matches=run_resp.metadata_matches,
        graph_traversal=run_resp.graph_traversal,
        temporal_filters=run_resp.temporal_filters,
        reranking_decisions=run_resp.reranking_decisions,
        final_prompt_context=run_resp.final_prompt_context,
        model_answer=run_resp.model_answer,
        grounded_citations=run_resp.grounded_citations,
        latency_ms=run_resp.latency_ms,
        confidence_score=run_resp.confidence_score,
        hallucination_risk=run_resp.hallucination_risk,
    )


@router.post("/{workflow_id}/simulate-multi", response_model=MultiStrategySimulationTrace,
             deprecated=True, description="Deprecated: use /run-multi instead")
async def simulate_workflow_multi(
    workflow_id: str, payload: MultiStrategySimulationRequest
) -> MultiStrategySimulationTrace:
    """Backwards-compatible simulate-multi alias."""
    multi_resp = await run_workflow_multi(
        workflow_id,
        MultiRunRequest(
            query=payload.query,
            project_id=payload.project_id,
            environment_id=payload.environment_id,
            strategies=payload.strategies or ["vector", "hybrid", "graph"],
            parameters=payload.parameters or {},
        ),
    )
    results: List[StrategyTrace] = []
    for r in multi_resp.results:
        results.append(
            StrategyTrace(
                strategy_id=r.strategy_id,
                trace=WorkflowSimulationTrace(
                    retrieved_sources=r.trace.retrieved_sources,
                    retrieval_path=r.trace.retrieval_path,
                    vector_hits=r.trace.vector_hits,
                    metadata_matches=r.trace.metadata_matches,
                    graph_traversal=r.trace.graph_traversal,
                    temporal_filters=r.trace.temporal_filters,
                    reranking_decisions=r.trace.reranking_decisions,
                    final_prompt_context=r.trace.final_prompt_context,
                    model_answer=r.trace.model_answer,
                    grounded_citations=r.trace.grounded_citations,
                    latency_ms=r.trace.latency_ms,
                    confidence_score=r.trace.confidence_score,
                    hallucination_risk=r.trace.hallucination_risk,
                ),
            )
        )
    return MultiStrategySimulationTrace(results=results)


# ── Run Tasks (list_workflow_runs moved above /{workflow_id} to avoid shadowing) ─


@router.get("/{workflow_id}/runs/{run_id}/tasks")
async def get_run_tasks(workflow_id: str, run_id: int) -> List[Dict[str, Any]]:
    """Return task executions (spans) for a given run — used by Observability page."""
    with get_session() as session:
        tasks = list(session.exec(
            select(TaskExecution).where(TaskExecution.run_id == run_id)
        ))
    return [
        {
            "id": t.id,
            "node_id": t.node_id,
            "node_type": t.node_type,
            "status": t.status,
            "started_at": t.started_at.isoformat() if t.started_at else None,
            "finished_at": t.finished_at.isoformat() if t.finished_at else None,
            "output": t.output_payload,
        }
        for t in tasks
    ]


