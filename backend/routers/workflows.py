from typing import List, Literal, Optional, Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


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

_WORKFLOWS: Dict[str, WorkflowDefinition] = {}


@router.get("/", response_model=List[WorkflowDefinition])
async def list_workflows() -> List[WorkflowDefinition]:
    return list(_WORKFLOWS.values())


@router.get("/{workflow_id}", response_model=WorkflowDefinition)
async def get_workflow(workflow_id: str) -> WorkflowDefinition:
    wf = _WORKFLOWS.get(workflow_id)
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


@router.post("/", response_model=WorkflowDefinition)
async def create_workflow(definition: WorkflowDefinition) -> WorkflowDefinition:
    if definition.id in _WORKFLOWS:
        raise HTTPException(status_code=400, detail="Workflow with this id already exists")
    _WORKFLOWS[definition.id] = definition
    return definition


@router.put("/{workflow_id}", response_model=WorkflowDefinition)
async def update_workflow(workflow_id: str, definition: WorkflowDefinition) -> WorkflowDefinition:
    if workflow_id not in _WORKFLOWS:
        raise HTTPException(status_code=404, detail="Workflow not found")
    _WORKFLOWS[workflow_id] = definition
    return definition


@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str) -> Dict[str, str]:
    if workflow_id not in _WORKFLOWS:
        raise HTTPException(status_code=404, detail="Workflow not found")
    del _WORKFLOWS[workflow_id]
    return {"status": "deleted"}


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


@router.post("/{workflow_id}/simulate", response_model=WorkflowSimulationTrace)
async def simulate_workflow(
    workflow_id: str, payload: WorkflowSimulationRequest
) -> WorkflowSimulationTrace:
    # Stubbed response to support Query Studio UI; replace with real orchestrator later.
    return WorkflowSimulationTrace(
        retrieved_sources=[],
        retrieval_path=[f"workflow:{workflow_id}", f"project:{payload.project_id}"],
        vector_hits=[],
        metadata_matches=[],
        graph_traversal=[],
        temporal_filters=[],
        reranking_decisions=[],
        final_prompt_context="Stub prompt context for demonstration.",
        model_answer="This is a stubbed answer from the RAG workflow simulation.",
        grounded_citations=[],
        latency_ms=123.4,
        confidence_score=0.82,
        hallucination_risk="low",
    )


@router.post("/{workflow_id}/simulate-multi", response_model=MultiStrategySimulationTrace)
async def simulate_workflow_multi(
    workflow_id: str, payload: MultiStrategySimulationRequest
) -> MultiStrategySimulationTrace:
    strategy_ids = payload.strategies or ["vector", "vectorless", "hybrid"]
    base_trace = await simulate_workflow(
        workflow_id,
        WorkflowSimulationRequest(
            project_id=payload.project_id,
            environment_id=payload.environment_id,
            query=payload.query,
        ),
    )
    results: List[StrategyTrace] = []
    for idx, strategy_id in enumerate(strategy_ids):
        tweaked = base_trace.model_copy()
        tweaked.latency_ms += idx * 10.0
        tweaked.confidence_score = max(0.0, min(1.0, base_trace.confidence_score - idx * 0.05))
        results.append(StrategyTrace(strategy_id=strategy_id, trace=tweaked))
    return MultiStrategySimulationTrace(results=results)

