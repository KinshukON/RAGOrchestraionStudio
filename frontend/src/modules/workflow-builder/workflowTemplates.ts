import type { WorkflowDefinition } from '../../api/workflows'

export type WorkflowTemplateId = 'vector' | 'vectorless' | 'graph' | 'temporal' | 'hybrid'

const base = (id: string, name: string, description: string, architecture_type: WorkflowTemplateId) =>
  ({ id, project_id: 'template', name, description, version: '0.1.0', architecture_type, is_active: false })

export const workflowTemplates: Record<WorkflowTemplateId, WorkflowDefinition> = {
  vector: {
    ...base('template-vector', 'Vector RAG Template', 'Single-stage vector retrieval with optional reranking.', 'vector'),
    nodes: [
      { id: 'n1', type: 'input_query', name: 'User Query', config: {}, position: { x: 40, y: 80 } },
      { id: 'n2', type: 'embedding_generator', name: 'Embedding', config: { model_ref: '' }, position: { x: 220, y: 80 } },
      { id: 'n3', type: 'vector_retriever', name: 'Vector Retriever', config: { top_k: 10 }, position: { x: 400, y: 80 } },
      { id: 'n4', type: 'reranker', name: 'Reranker', config: {}, position: { x: 580, y: 80 } },
      { id: 'n5', type: 'llm_answer_generator', name: 'Answer', config: {}, position: { x: 760, y: 80 } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', condition: null },
      { id: 'e2', source: 'n2', target: 'n3', condition: null },
      { id: 'e3', source: 'n3', target: 'n4', condition: null },
      { id: 'e4', source: 'n4', target: 'n5', condition: null },
    ],
  },
  vectorless: {
    ...base('template-vectorless', 'Vectorless RAG Template', 'Metadata and lexical-based retrieval without vector index.', 'vectorless'),
    nodes: [
      { id: 'n1', type: 'input_query', name: 'User Query', config: {}, position: { x: 40, y: 80 } },
      { id: 'n2', type: 'lexical_retriever', name: 'Lexical Retriever', config: { index_ref: '' }, position: { x: 260, y: 80 } },
      { id: 'n3', type: 'metadata_filter', name: 'Metadata Filter', config: {}, position: { x: 460, y: 80 } },
      { id: 'n4', type: 'llm_answer_generator', name: 'Answer', config: {}, position: { x: 660, y: 80 } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', condition: null },
      { id: 'e2', source: 'n2', target: 'n3', condition: null },
      { id: 'e3', source: 'n3', target: 'n4', condition: null },
    ],
  },
  graph: {
    ...base('template-graph', 'Graph RAG Template', 'Entity graph traversal for relational reasoning.', 'graph'),
    nodes: [
      { id: 'n1', type: 'input_query', name: 'User Query', config: {}, position: { x: 40, y: 80 } },
      { id: 'n2', type: 'graph_retriever', name: 'Graph Retriever', config: { traversal_depth: 2 }, position: { x: 260, y: 80 } },
      { id: 'n3', type: 'context_assembler', name: 'Context', config: {}, position: { x: 460, y: 80 } },
      { id: 'n4', type: 'llm_answer_generator', name: 'Answer', config: {}, position: { x: 660, y: 80 } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', condition: null },
      { id: 'e2', source: 'n2', target: 'n3', condition: null },
      { id: 'e3', source: 'n3', target: 'n4', condition: null },
    ],
  },
  temporal: {
    ...base('template-temporal', 'Temporal RAG Template', 'Time-aware retrieval with snapshot and timeline options.', 'temporal'),
    nodes: [
      { id: 'n1', type: 'input_query', name: 'User Query', config: {}, position: { x: 40, y: 80 } },
      { id: 'n2', type: 'temporal_filter', name: 'Temporal Filter', config: { time_window: '30d' }, position: { x: 260, y: 80 } },
      { id: 'n3', type: 'vector_retriever', name: 'Vector Retriever', config: { top_k: 10 }, position: { x: 460, y: 80 } },
      { id: 'n4', type: 'llm_answer_generator', name: 'Answer', config: {}, position: { x: 660, y: 80 } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', condition: null },
      { id: 'e2', source: 'n2', target: 'n3', condition: null },
      { id: 'e3', source: 'n3', target: 'n4', condition: null },
    ],
  },
  hybrid: {
    ...base('template-hybrid', 'Hybrid RAG Template', 'Hybrid vector, lexical, and graph retrieval with temporal filters.', 'hybrid'),
    nodes: [
      { id: 'n1', type: 'input_query', name: 'User Query', config: {}, position: { x: 40, y: 120 } },
      { id: 'n2', type: 'query_classifier', name: 'Intent Classifier', config: {}, position: { x: 220, y: 120 } },
      { id: 'n3', type: 'vector_retriever', name: 'Vector', config: { top_k: 8 }, position: { x: 420, y: 40 } },
      { id: 'n4', type: 'lexical_retriever', name: 'Lexical', config: {}, position: { x: 420, y: 120 } },
      { id: 'n5', type: 'reranker', name: 'Reranker', config: {}, position: { x: 600, y: 80 } },
      { id: 'n6', type: 'llm_answer_generator', name: 'Answer', config: {}, position: { x: 780, y: 80 } },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2', condition: null },
      { id: 'e2', source: 'n2', target: 'n3', condition: null },
      { id: 'e3', source: 'n2', target: 'n4', condition: null },
      { id: 'e4', source: 'n3', target: 'n5', condition: null },
      { id: 'e5', source: 'n4', target: 'n5', condition: null },
      { id: 'e6', source: 'n5', target: 'n6', condition: null },
    ],
  },
}

