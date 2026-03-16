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

// ── Original architecture builders ───────────────────────────────────────────

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

// ── New architecture node builders ───────────────────────────────────────────

function agenticNodes(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    return {
        nodes: [
            node('n1', 'input_query', 'User Query', {}, 40, 180),
            node('n2', 'query_classifier', 'Agent Controller', { mode: 'agentic', routing: 'tool_selection' }, 260, 180),
            node('n3', 'vector_retriever', 'Knowledge Retriever', { top_k: 10 }, 480, 80),
            node('n4', 'metadata_filter', 'Tool: Database Query', { tool_type: 'sql' }, 480, 180),
            node('n5', 'guardrail', 'Guardrail', { check: 'tool_output_safety' }, 480, 280),
            node('n6', 'context_assembler', 'Context Assembler', { merge: 'agent_results' }, 700, 180),
            node('n7', 'llm_answer_generator', 'Agent Reasoner', { reasoning: 'chain_of_thought' }, 920, 180),
        ],
        edges: [
            edge('e1', 'n1', 'n2'),
            edge('e2', 'n2', 'n3'),
            edge('e3', 'n2', 'n4'),
            edge('e4', 'n2', 'n5'),
            edge('e5', 'n3', 'n6'),
            edge('e6', 'n4', 'n6'),
            edge('e7', 'n5', 'n6'),
            edge('e8', 'n6', 'n7'),
        ],
    }
}

function modularNodes(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    return {
        nodes: [
            node('n1', 'input_query', 'User Query', {}, 40, 160),
            node('n2', 'intent_detector', 'Query Router', { routing: 'module_selection' }, 260, 160),
            node('n3', 'embedding_generator', 'Retrieval Module', { module: 'retrieval' }, 480, 80),
            node('n4', 'reranker', 'Reasoning Module', { module: 'reasoning' }, 480, 160),
            node('n5', 'context_assembler', 'Generation Module', { module: 'generation' }, 480, 240),
            node('n6', 'llm_answer_generator', 'Output Assembler', { module: 'output' }, 720, 160),
        ],
        edges: [
            edge('e1', 'n1', 'n2'),
            edge('e2', 'n2', 'n3'),
            edge('e3', 'n2', 'n4'),
            edge('e4', 'n2', 'n5'),
            edge('e5', 'n3', 'n6'),
            edge('e6', 'n4', 'n6'),
            edge('e7', 'n5', 'n6'),
        ],
    }
}

function memoryAugmentedNodes(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    return {
        nodes: [
            node('n1', 'input_query', 'User Query', {}, 40, 120),
            node('n2', 'metadata_filter', 'Memory Retriever', { source: 'session_memory' }, 260, 60),
            node('n3', 'embedding_generator', 'Embedding', {}, 260, 180),
            node('n4', 'vector_retriever', 'Knowledge Retriever', { top_k: 10 }, 480, 180),
            node('n5', 'context_assembler', 'Context Merger', { merge: 'memory+knowledge' }, 680, 120),
            node('n6', 'llm_answer_generator', 'Answer Generator', {}, 880, 120),
        ],
        edges: [
            edge('e1', 'n1', 'n2'),
            edge('e2', 'n1', 'n3'),
            edge('e3', 'n3', 'n4'),
            edge('e4', 'n2', 'n5'),
            edge('e5', 'n4', 'n5'),
            edge('e6', 'n5', 'n6'),
        ],
    }
}

function multimodalNodes(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    return {
        nodes: [
            node('n1', 'input_query', 'Multi-Modal Input', { accepts: 'text,image,audio' }, 40, 160),
            node('n2', 'embedding_generator', 'Text Embedder', { model: 'text' }, 280, 80),
            node('n3', 'embedding_generator', 'Image Embedder', { model: 'clip' }, 280, 160),
            node('n4', 'embedding_generator', 'Audio Embedder', { model: 'whisper' }, 280, 240),
            node('n5', 'vector_retriever', 'Multi-Modal Retriever', { top_k: 10, fusion: 'cross_modal' }, 520, 160),
            node('n6', 'reranker', 'Cross-Modal Reranker', {}, 720, 160),
            node('n7', 'llm_answer_generator', 'Multi-Modal Generator', {}, 920, 160),
        ],
        edges: [
            edge('e1', 'n1', 'n2'),
            edge('e2', 'n1', 'n3'),
            edge('e3', 'n1', 'n4'),
            edge('e4', 'n2', 'n5'),
            edge('e5', 'n3', 'n5'),
            edge('e6', 'n4', 'n5'),
            edge('e7', 'n5', 'n6'),
            edge('e8', 'n6', 'n7'),
        ],
    }
}

function federatedNodes(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    return {
        nodes: [
            node('n1', 'input_query', 'User Query', {}, 40, 160),
            node('n2', 'query_classifier', 'Federation Router', { mode: 'federated' }, 260, 160),
            node('n3', 'vector_retriever', 'Source A Retriever', { source: 'org_a' }, 500, 80),
            node('n4', 'vector_retriever', 'Source B Retriever', { source: 'org_b' }, 500, 160),
            node('n5', 'vector_retriever', 'Source C Retriever', { source: 'org_c' }, 500, 240),
            node('n6', 'reranker', 'Federated Fusion', { privacy: 'differential' }, 720, 160),
            node('n7', 'guardrail', 'Privacy Guardrail', { check: 'data_residency' }, 900, 160),
            node('n8', 'llm_answer_generator', 'Answer Generator', {}, 1080, 160),
        ],
        edges: [
            edge('e1', 'n1', 'n2'),
            edge('e2', 'n2', 'n3'),
            edge('e3', 'n2', 'n4'),
            edge('e4', 'n2', 'n5'),
            edge('e5', 'n3', 'n6'),
            edge('e6', 'n4', 'n6'),
            edge('e7', 'n5', 'n6'),
            edge('e8', 'n6', 'n7'),
            edge('e9', 'n7', 'n8'),
        ],
    }
}

function streamingNodes(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    return {
        nodes: [
            node('n1', 'input_query', 'Stream Ingestion', { source: 'kafka/kinesis' }, 40, 120),
            node('n2', 'temporal_filter', 'Real-Time Window', { window: 'sliding_60s' }, 260, 120),
            node('n3', 'embedding_generator', 'Live Embedding', {}, 460, 120),
            node('n4', 'vector_retriever', 'Hot Index Retriever', { index: 'realtime' }, 660, 120),
            node('n5', 'llm_answer_generator', 'Stream Responder', { streaming: true }, 860, 120),
        ],
        edges: [
            edge('e1', 'n1', 'n2'),
            edge('e2', 'n2', 'n3'),
            edge('e3', 'n3', 'n4'),
            edge('e4', 'n4', 'n5'),
        ],
    }
}

function contextualNodes(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    return {
        nodes: [
            node('n1', 'input_query', 'User Query', {}, 40, 120),
            node('n2', 'metadata_filter', 'Session Context Loader', { source: 'conversation_history' }, 280, 60),
            node('n3', 'query_classifier', 'Context-Aware Rewriter', { mode: 'contextual_rewrite' }, 280, 180),
            node('n4', 'embedding_generator', 'Embedding', {}, 520, 120),
            node('n5', 'vector_retriever', 'Contextual Retriever', { top_k: 10 }, 720, 120),
            node('n6', 'llm_answer_generator', 'Conversational Generator', {}, 920, 120),
        ],
        edges: [
            edge('e1', 'n1', 'n2'),
            edge('e2', 'n1', 'n3'),
            edge('e3', 'n2', 'n3'),
            edge('e4', 'n3', 'n4'),
            edge('e5', 'n4', 'n5'),
            edge('e6', 'n5', 'n6'),
        ],
    }
}

function knowledgeEnhancedNodes(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    return {
        nodes: [
            node('n1', 'input_query', 'User Query', {}, 40, 140),
            node('n2', 'graph_retriever', 'Knowledge Graph Lookup', { traversal: 'ontology_guided' }, 280, 80),
            node('n3', 'vector_retriever', 'Document Retriever', { top_k: 10 }, 280, 200),
            node('n4', 'context_assembler', 'Knowledge Fusion', { merge: 'kg+docs' }, 520, 140),
            node('n5', 'llm_answer_generator', 'Knowledge-Grounded Generator', {}, 740, 140),
        ],
        edges: [
            edge('e1', 'n1', 'n2'),
            edge('e2', 'n1', 'n3'),
            edge('e3', 'n2', 'n4'),
            edge('e4', 'n3', 'n4'),
            edge('e5', 'n4', 'n5'),
        ],
    }
}

function selfRagNodes(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    return {
        nodes: [
            node('n1', 'input_query', 'User Query', {}, 40, 120),
            node('n2', 'embedding_generator', 'Embedding', {}, 240, 120),
            node('n3', 'vector_retriever', 'Retriever', { top_k: 10 }, 440, 120),
            node('n4', 'llm_answer_generator', 'Draft Generator', { mode: 'draft' }, 640, 120),
            node('n5', 'guardrail', 'Self-Evaluator', { check: 'relevance_coherence', action: 'refine_or_accept' }, 840, 120),
            node('n6', 'llm_answer_generator', 'Refined Generator', { mode: 'refined' }, 1040, 120),
        ],
        edges: [
            edge('e1', 'n1', 'n2'),
            edge('e2', 'n2', 'n3'),
            edge('e3', 'n3', 'n4'),
            edge('e4', 'n4', 'n5'),
            edge('e5', 'n5', 'n6'),
        ],
    }
}

function hydeNodes(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    return {
        nodes: [
            node('n1', 'input_query', 'User Query', {}, 40, 120),
            node('n2', 'llm_answer_generator', 'Hypothetical Doc Generator', { mode: 'hypothesis' }, 280, 120),
            node('n3', 'embedding_generator', 'HyDE Embedding', { source: 'hypothetical_document' }, 520, 120),
            node('n4', 'vector_retriever', 'Guided Retriever', { top_k: 10 }, 720, 120),
            node('n5', 'reranker', 'Reranker', {}, 920, 120),
            node('n6', 'llm_answer_generator', 'Final Answer', {}, 1100, 120),
        ],
        edges: [
            edge('e1', 'n1', 'n2'),
            edge('e2', 'n2', 'n3'),
            edge('e3', 'n3', 'n4'),
            edge('e4', 'n4', 'n5'),
            edge('e5', 'n5', 'n6'),
        ],
    }
}

function recursiveNodes(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    return {
        nodes: [
            node('n1', 'input_query', 'User Query', {}, 40, 140),
            node('n2', 'query_classifier', 'Query Decomposer', { mode: 'decompose' }, 260, 140),
            node('n3', 'vector_retriever', 'Round 1 Retriever', { top_k: 10, round: 1 }, 480, 80),
            node('n4', 'llm_answer_generator', 'Round 1 Reasoner', { round: 1 }, 700, 80),
            node('n5', 'vector_retriever', 'Round 2 Retriever', { top_k: 10, round: 2 }, 480, 200),
            node('n6', 'llm_answer_generator', 'Round 2 Reasoner', { round: 2 }, 700, 200),
            node('n7', 'context_assembler', 'Multi-Round Aggregator', {}, 920, 140),
            node('n8', 'llm_answer_generator', 'Final Synthesizer', {}, 1120, 140),
        ],
        edges: [
            edge('e1', 'n1', 'n2'),
            edge('e2', 'n2', 'n3'),
            edge('e3', 'n2', 'n5'),
            edge('e4', 'n3', 'n4'),
            edge('e5', 'n4', 'n7'),
            edge('e6', 'n5', 'n6'),
            edge('e7', 'n6', 'n7'),
            edge('e8', 'n7', 'n8'),
        ],
    }
}

function domainSpecificNodes(): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    return {
        nodes: [
            node('n1', 'input_query', 'Domain Query', {}, 40, 140),
            node('n2', 'intent_detector', 'Domain Intent Classifier', { domains: 'legal,medical,financial' }, 280, 140),
            node('n3', 'embedding_generator', 'Domain Embedding', { model: 'domain_tuned' }, 500, 80),
            node('n4', 'vector_retriever', 'Domain Corpus Retriever', { top_k: 10, corpus: 'domain_specific' }, 500, 200),
            node('n5', 'guardrail', 'Compliance Checker', { check: 'regulatory', domain: 'auto' }, 720, 140),
            node('n6', 'llm_answer_generator', 'Domain Expert Generator', { domain_tuned: true }, 940, 140),
        ],
        edges: [
            edge('e1', 'n1', 'n2'),
            edge('e2', 'n2', 'n3'),
            edge('e3', 'n2', 'n4'),
            edge('e4', 'n3', 'n5'),
            edge('e5', 'n4', 'n5'),
            edge('e6', 'n5', 'n6'),
        ],
    }
}

// Lookup for new architecture types
const NEW_ARCH_BUILDERS: Record<string, { builder: () => { nodes: WorkflowNode[]; edges: WorkflowEdge[] }; label: string; desc: string }> = {
    agentic:            { builder: agenticNodes,          label: 'Agentic RAG',              desc: 'Autonomous agent with dynamic tool calls and reasoning.' },
    modular:            { builder: modularNodes,          label: 'Modular RAG',              desc: 'Independent swappable modules for retrieval, reasoning, and generation.' },
    memory_augmented:   { builder: memoryAugmentedNodes,  label: 'Memory-Augmented RAG',     desc: 'Long-term memory with knowledge retrieval for personalized responses.' },
    multimodal:         { builder: multimodalNodes,       label: 'Multi-Modal RAG',          desc: 'Cross-modal retrieval across text, image, and audio.' },
    federated:          { builder: federatedNodes,        label: 'Federated RAG',            desc: 'Privacy-preserving retrieval across decentralized data sources.' },
    streaming:          { builder: streamingNodes,        label: 'Streaming RAG',            desc: 'Real-time retrieval and generation from live event streams.' },
    contextual:         { builder: contextualNodes,       label: 'Contextual Retrieval RAG', desc: 'Context-aware retrieval using conversation history.' },
    knowledge_enhanced: { builder: knowledgeEnhancedNodes,label: 'Knowledge-Enhanced RAG',   desc: 'Ontology and knowledge graph-grounded retrieval.' },
    self_rag:           { builder: selfRagNodes,          label: 'Self-RAG',                 desc: 'Self-reflection with iterative retrieval refinement.' },
    hyde:               { builder: hydeNodes,             label: 'HyDE RAG',                 desc: 'Hypothetical document embedding for guided retrieval.' },
    recursive:          { builder: recursiveNodes,        label: 'Recursive / Multi-Step RAG', desc: 'Multiple rounds of retrieval and generation.' },
    domain_specific:    { builder: domainSpecificNodes,   label: 'Domain-Specific RAG',      desc: 'Industry-tailored pipeline with compliance guardrails.' },
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
        default: {
            // Check new architecture types by archType key
            const archBuilder = NEW_ARCH_BUILDERS[archType]
            if (archBuilder) {
                graph = archBuilder.builder()
                name = `${archBuilder.label} — Session #${sessionId}`
                description = `Generated from Guided Designer session #${sessionId}. ${archBuilder.desc}`
            } else {
                graph = customNodes()
                name = `Custom RAG — Session #${sessionId}`
                description = `Generated from Guided Designer session #${sessionId}. Custom pipeline.`
            }
        }
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
