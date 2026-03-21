import time
import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlmodel import Session, select

from db import get_session
from models_core import (
    WorkflowDefinition,
    KnowledgeBase,
    Corpus,
    EvaluationProfile,
    CertificationRecord,
    IndexJob
)

router = APIRouter()

# === AOS Discovery APIs ===

class AssetListResponse(BaseModel):
    items: List[Dict[str, Any]]
    total: int

@router.get("/pipelines", response_model=AssetListResponse)
def list_published_pipelines(
    tenant_id: str = "default",
    workspace_id: str = "default",
    db: Session = Depends(get_session)
):
    """AOS calls this to discover consumable RAG pipelines."""
    # Only return published/certified pipelines to AOS
    statement = select(WorkflowDefinition).where(
        WorkflowDefinition.tenant_id == tenant_id,
        WorkflowDefinition.workspace_id == workspace_id,
        WorkflowDefinition.status.in_(["published", "certified"])
    )
    results = db.exec(statement).all()
    
    items = [
        {
            "id": w.id,
            "name": w.name,
            "description": w.description,
            "version": w.version,
            "status": w.status,
            "certification_status": w.certification_status,
            "freshness_status": w.freshness_status,
            "architecture_type": w.architecture_type,
            "tags": w.tags,
            "use_case_metadata": w.use_case_metadata
        }
        for w in results
    ]
    return {"items": items, "total": len(items)}

@router.get("/pipelines/{pipeline_id}")
def get_pipeline_details(
    pipeline_id: int,
    tenant_id: str = "default",
    db: Session = Depends(get_session)
):
    w = db.get(WorkflowDefinition, pipeline_id)
    if not w or w.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return w

@router.get("/knowledge-bases", response_model=AssetListResponse)
def list_knowledge_bases(
    tenant_id: str = "default",
    workspace_id: str = "default",
    db: Session = Depends(get_session)
):
    statement = select(KnowledgeBase).where(
        KnowledgeBase.tenant_id == tenant_id,
        KnowledgeBase.workspace_id == workspace_id,
        KnowledgeBase.status.in_(["published", "certified"])
    )
    results = db.exec(statement).all()
    items = [r.dict() for r in results]
    return {"items": items, "total": len(items)}

@router.get("/corpora/{corpus_id}")
def get_corpus_details(
    corpus_id: int,
    tenant_id: str = "default",
    db: Session = Depends(get_session)
):
    c = db.get(Corpus, corpus_id)
    if not c or c.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Corpus not found")
    return c

# === Metadata & Governance APIs ===

@router.get("/evaluations/{profile_id}")
def get_evaluation_profile(
    profile_id: int,
    tenant_id: str = "default",
    db: Session = Depends(get_session)
):
    p = db.get(EvaluationProfile, profile_id)
    if not p or p.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Evaluation profile not found")
    return p

@router.get("/certification/{asset_id}")
def get_certification_status(
    asset_id: str,
    asset_type: str = "workflow",
    db: Session = Depends(get_session)
):
    statement = select(CertificationRecord).where(
        CertificationRecord.asset_id == asset_id,
        CertificationRecord.asset_type == asset_type
    ).order_by(CertificationRecord.created_at.desc())
    rec = db.exec(statement).first()
    if not rec:
        return {"status": "uncertified", "history": []}
    return rec

@router.get("/freshness/{asset_type}/{asset_id}")
def get_freshness_status(
    asset_type: str,
    asset_id: int,
    db: Session = Depends(get_session)
):
    # Route logic to check appropriate asset table based on type
    if asset_type == "workflow":
        asset = db.get(WorkflowDefinition, asset_id)
    elif asset_type == "corpus":
        asset = db.get(Corpus, asset_id)
    elif asset_type == "knowledge_base":
        asset = db.get(KnowledgeBase, asset_id)
    else:
        raise HTTPException(status_code=400, detail="Unknown asset type")
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    return {
        "asset_id": asset_id,
        "asset_type": asset_type,
        "freshness_status": getattr(asset, "freshness_status", "unknown"),
        "last_updated": asset.updated_at
    }

@router.post("/reindex/{corpus_id}")
def trigger_corpus_reindex(
    corpus_id: int,
    tenant_id: str = "default",
    db: Session = Depends(get_session)
):
    c = db.get(Corpus, corpus_id)
    if not c or c.tenant_id != tenant_id:
        raise HTTPException(status_code=404, detail="Corpus not found")
    
    # In a real system we would queue a task here.
    job = IndexJob(
        corpus_id=c.id,
        tenant_id=tenant_id,
        status="pending"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"status": "accepted", "job_id": job.id}

# === AOS Runtime API Contracts ===

class RetrievalRequest(BaseModel):
    query: str
    pipeline_id: int
    pipeline_version: Optional[str] = None
    retrieval_mode: str = "hybrid"   # vector | hybrid | graph | bm25
    knowledge_base_id: Optional[int] = None
    corpus_id: Optional[int] = None
    top_k: int = 5
    tenant_id: str = "default"
    workspace_id: str = "default"

    model_config = ConfigDict(extra="allow")

class RuntimeRetrievalResponse(BaseModel):
    request_id: str
    pipeline_id: str
    pipeline_version: str
    knowledge_base_id: Optional[str] = None
    corpus_id: Optional[str] = None
    query: str
    retrieval_mode: str
    retrieved_results: List[Dict[str, Any]]
    result_scores: List[float]
    citations_and_source_metadata: List[Dict[str, Any]]
    reranker_metadata: Optional[Dict[str, Any]] = None
    latency_ms: int
    evaluation_profile_used: Optional[str] = None
    certification_status: str
    freshness_status: str
    governance_flags: List[str]

@router.post("/retrieve", response_model=RuntimeRetrievalResponse)
def execute_aos_retrieval(
    request: RetrievalRequest,
    db: Session = Depends(get_session)
):
    """
    Primary ingestion point for AOS executing a retrieval operation
    against a governed RAGOS pipeline. Returns deep provenance metadata.
    """
    start_time = time.time()
    
    pipeline = db.get(WorkflowDefinition, request.pipeline_id)
    if not pipeline or pipeline.tenant_id != request.tenant_id:
        raise HTTPException(status_code=404, detail="Pipeline not found or unauthorized")
        
    if pipeline.status not in ["published", "certified"]:
        raise HTTPException(status_code=403, detail="Pipeline is not cleared for external AOS execution")

    # MOCK Retrieval logic representing RAGOS runtime subsystem execution
    mock_results = [
        {"id": "doc_1", "content": "Synthetic result supporting exact integration contract."},
        {"id": "doc_2", "content": "RAGOS guarantees structured metadata return."}
    ]
    mock_scores = [0.92, 0.85]
    mock_citations = [
        {"doc_id": "doc_1", "source_uri": "s3://corp/doc1.pdf", "chunk_index": 5},
        {"doc_id": "doc_2", "source_uri": "confluence://page/90210", "chunk_index": 2}
    ]
    
    latency = int((time.time() - start_time) * 1000) + 15  # ms
    
    return RuntimeRetrievalResponse(
        request_id=str(uuid.uuid4()),
        pipeline_id=str(pipeline.id),
        pipeline_version=pipeline.version,
        knowledge_base_id=str(request.knowledge_base_id) if request.knowledge_base_id else None,
        corpus_id=str(request.corpus_id) if request.corpus_id else None,
        query=request.query,
        retrieval_mode=request.retrieval_mode,
        retrieved_results=mock_results,
        result_scores=mock_scores,
        citations_and_source_metadata=mock_citations,
        reranker_metadata=None,
        latency_ms=latency,
        evaluation_profile_used="Baseline Enterprise Eval 2.0" if pipeline.evaluation_status == "passing" else None,
        certification_status=pipeline.certification_status,
        freshness_status=pipeline.freshness_status,
        governance_flags=["pii_redacted", "approved_use_case"] if pipeline.certification_status == "certified" else []
    )

@router.post("/retrieve-rerank", response_model=RuntimeRetrievalResponse)
def execute_aos_retrieval_with_rerank(
    request: RetrievalRequest,
    reranker_profile_id: int,
    db: Session = Depends(get_session)
):
    """Executes retrieval and performs explicit reranking pass, recording reranker metadata."""
    # Defers to the primary retrieval for now, simulating reranker output
    base_response = execute_aos_retrieval(request, db)
    
    # Inject reranker specific provenance
    base_response.reranker_metadata = {
        "profile_id": reranker_profile_id,
        "model_used": "cohere-rerank-english-v3.0",
        "doc_count_before": 50,
        "doc_count_after": request.top_k,
        "latency_ms": 120
    }
    base_response.latency_ms += 120
    return base_response
