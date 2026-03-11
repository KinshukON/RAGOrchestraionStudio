from typing import List, Literal, Optional, Dict, Any

from fastapi import APIRouter
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


@router.get("/", response_model=List[WorkflowDefinition])
async def list_workflows() -> List[WorkflowDefinition]:
    return []


@router.post("/", response_model=WorkflowDefinition)
async def create_workflow(definition: WorkflowDefinition) -> WorkflowDefinition:
    return definition

