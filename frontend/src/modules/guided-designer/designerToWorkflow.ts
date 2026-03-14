/**
 * Maps a DesignerWizardState → WorkflowDefinition so the Guided Designer
 * can directly generate a runnable workflow graph in the Workflow Builder.
 *
 * Each architecture type gets a canonical node/edge set that mirrors what
 * the Workflow Builder's workflowTemplates already use, but with config
 * values pre-filled from the wizard choices.
 */

import type { WorkflowDefinition, WorkflowNode, WorkflowEdge } from '../../api/workflows'
import type { DesignerWizardState, VectorRagConfig, VectorlessRagConfig, GraphRagConfig, TemporalRagConfig, HybridRagConfig } from './designerTypes'

/** Generate a stable but unique workflow id from the session id. */
function makeWorkflowId(sessionId: number): string {
    return `designer-${sessionId}-${Date.now().toString(36)}`
}

function node(id: string, type: string, name: string, config: Record<string, unknown>, x: number, y: number): WorkflowNode {
    return { id, type: type as WorkflowNode['type'], name, config, position: { x, y } }
}

function edge(id: string, source: string, target: string): WorkflowEdge {
    return { id, source, target, condition: null }
}

// ── Per-architecture builders ────────────────────────────────────────────────

function vectorNodes(cfg: VectorRagConfig): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    const nodes: WorkflowNode[] = [
        node('n1', 'input_query', 'User Query', {}, 40, 120),
        node('n2', 'embedding_generator', 'Embedding', { model_ref: cfg.embeddingModel || '' }, 240, 120),
        node('n3', 'vector_retriever', 'Vector Retriever', { index_ref: cfg.vectorDatabase || '', top_k: cfg.topK || 10, similarity: cfg.similarityMetric || 'cosine' }, 440, 120),
        ...(cfg.metadataFilters ? [node('n4', 'metadata_filter', 'Metadata Filter', { filters: cfg.metadataFilters }, 620, 80)] : []),
        ...(cfg.reranker ? [node('nr', 'reranker', 'Reranker', { reranker_ref: cfg.reranker }, 620, 160)] : []),
        node('n5', 'llm_answer_generator', 'Answer Generator', { model_ref: cfg.answerModel || '' }, 820, 120),
    ]
    const lastRetrievalId = cfg.metadataFilters ? 'n4' : cfg.reranker ? 'nr' : 'n3'
    const edges: WorkflowEdge[] = [
        edge('e1', 'n1', 'n2'),
        edge('e2', 'n2', 'n3'),
        ...(cfg.metadataFilters ? [edge('e3', 'n3', 'n4')] : []),
        ...(cfg.reranker ? [edge('e4', cfg.metadataFilters ? 'n4' : 'n3', 'nr')] : []),
        edge('e5', lastRetrievalId, 'n5'),
    ]
    return { nodes, edges }
}

function vectorlessNodes(cfg: VectorlessRagConfig): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    const nodes: WorkflowNode[] = [
        node('n1', 'input_query', 'User Query', {}, 40, 120),
        node('n2', 'lexical_retriever', 'Lexical Retriever', { strategy: cfg.lexicalRetrieval || 'bm25' }, 240, 80),
        node('n3', 'metadata_filter', 'Metadata Filter', { filters: cfg.metadataFilters || '', symbolic: cfg.symbolicSelection || '' }, 240, 200),
        node('n4', 'context_assembler', 'Context Assembler', { parsing_strategy: cfg.documentParsingStrategy || 'sections' }, 480, 120),
        node('n5', 'llm_answer_generator', 'Answer Generator', { model_ref: cfg.answerModel || '' }, 680, 120),
    ]
    const edges: WorkflowEdge[] = [
        edge('e1', 'n1', 'n2'),
        edge('e2', 'n1', 'n3'),
        edge('e3', 'n2', 'n4'),
        edge('e4', 'n3', 'n4'),
        edge('e5', 'n4', 'n5'),
    ]
    return { nodes, edges }
}

function graphNodes(cfg: GraphRagConfig): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    const nodes: WorkflowNode[] = [
        node('n1', 'input_query', 'User Query', {}, 40, 120),
        node('n2', 'graph_retriever', 'Graph Retriever', { graph_db_ref: cfg.graphDatabase || '', traversal_depth: cfg.traversalDepth || 2, expansion: cfg.expansionLogic || 'neighbors' }, 260, 120),
        node('n3', 'reranker', 'Graph Reranker', { strategy: cfg.rankingStrategy || 'path_score' }, 480, 120),
        node('n4', 'context_assembler', 'Context Assembler', {}, 680, 120),
        node('n5', 'llm_answer_generator', 'Answer Generator', { model_ref: cfg.answerModel || '' }, 880, 120),
    ]
    const edges: WorkflowEdge[] = [
        edge('e1', 'n1', 'n2'),
        edge('e2', 'n2', 'n3'),
        edge('e3', 'n3', 'n4'),
        edge('e4', 'n4', 'n5'),
    ]
    return { nodes, edges }
}

function temporalNodes(cfg: TemporalRagConfig): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    const nodes: WorkflowNode[] = [
        node('n1', 'input_query', 'User Query', {}, 40, 120),
        node('n2', 'temporal_filter', 'Temporal Filter', { time_window: cfg.timeWindow || '30d', effective_date_logic: cfg.effectiveDateLogic || 'valid_from_to', recency_weight: cfg.recencyWeighting || 'medium' }, 240, 120),
        node('n3', 'vector_retriever', 'Vector Retriever', { index_ref: cfg.timeAwareIndexSource || '', top_k: 10 }, 460, 120),
        node('n4', 'llm_answer_generator', 'Answer Generator', { model_ref: cfg.answerModel || '' }, 680, 120),
    ]
    const edges: WorkflowEdge[] = [
        edge('e1', 'n1', 'n2'),
        edge('e2', 'n2', 'n3'),
        edge('e3', 'n3', 'n4'),
    ]
    return { nodes, edges }
}

function hybridNodes(cfg: HybridRagConfig): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    const isParallel = cfg.executionMode === 'parallel'
    const nodes: WorkflowNode[] = [
        node('n1', 'input_query', 'User Query', {}, 40, 180),
        node('n2', 'query_classifier', 'Intent Classifier', { routing_policy: cfg.routingPolicy || 'intent_based' }, 240, 180),
        node('n3', 'vector_retriever', 'Vector Retriever', { top_k: 10 }, 460, 80),
        node('n4', 'lexical_retriever', 'Lexical Retriever', { strategy: 'bm25' }, 460, 180),
        node('n5', 'reranker', 'Fusion + Reranker', { fusion: cfg.scoreFusionStrategy || 'weighted_sum' }, 680, 180),
        node('n6', 'llm_answer_generator', 'Answer Generator', { model_ref: cfg.answerModel || '', fallback: cfg.fallbackBehavior || 'fallback_to_best_single' }, 880, 180),
    ]
    const edges: WorkflowEdge[] = [
        edge('e1', 'n1', 'n2'),
        edge('e2', 'n2', 'n3'),
        ...(isParallel ? [edge('e3', 'n2', 'n4')] : [edge('e3', 'n3', 'n4')]),
        edge('e4', 'n3', 'n5'),
        edge('e5', 'n4', 'n5'),
        edge('e6', 'n5', 'n6'),
    ]
    return { nodes, edges }
}

function customNodes(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    return {
        nodes: [
            node('n1', 'input_query', 'User Query', {}, 40, 120),
            node('n2', 'vector_retriever', 'Retriever', {}, 260, 120),
            node('n3', 'llm_answer_generator', 'Answer Generator', {}, 480, 120),
        ],
        edges: [
            edge('e1', 'n1', 'n2'),
            edge('e2', 'n2', 'n3'),
        ],
    }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function wizardStateToWorkflowDefinition(
    state: DesignerWizardState,
    sessionId: number,
): WorkflowDefinition {
    const id = makeWorkflowId(sessionId)
    const archType = state.architecture_type
    const cfg = state.architecture_config

    let graph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }
    let name: string
    let description: string

    switch (cfg.type) {
        case 'vector':
            graph = vectorNodes(cfg.config)
            name = `Vector RAG — Session #${sessionId}`
            description = `Generated from Guided Designer session #${sessionId}. Vector retrieval with embedding + reranking pipeline.`
            break
        case 'vectorless':
            graph = vectorlessNodes(cfg.config)
            name = `Vectorless RAG — Session #${sessionId}`
            description = `Generated from Guided Designer session #${sessionId}. Lexical + metadata retrieval without vector index.`
            break
        case 'graph':
            graph = graphNodes(cfg.config)
            name = `Graph RAG — Session #${sessionId}`
            description = `Generated from Guided Designer session #${sessionId}. Entity graph traversal for relational reasoning.`
            break
        case 'temporal':
            graph = temporalNodes(cfg.config)
            name = `Temporal RAG — Session #${sessionId}`
            description = `Generated from Guided Designer session #${sessionId}. Time-aware retrieval with as-of date filtering.`
            break
        case 'hybrid':
            graph = hybridNodes(cfg.config)
            name = `Hybrid RAG — Session #${sessionId}`
            description = `Generated from Guided Designer session #${sessionId}. Multi-mode retrieval with ${(cfg.config as HybridRagConfig).executionMode} execution.`
            break
        default:
            graph = customNodes()
            name = `Custom RAG — Session #${sessionId}`
            description = `Generated from Guided Designer session #${sessionId}. Custom pipeline.`
    }

    return {
        id,
        project_id: 'default',
        name,
        description,
        version: '1.0.0',
        architecture_type: archType,
        is_active: false,
        ...graph,
    }
}
