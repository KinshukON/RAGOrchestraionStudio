import type { WorkflowDefinition } from '../../api/workflows'

export type WorkflowTemplateId = 'vector' | 'vectorless' | 'graph' | 'temporal' | 'hybrid'

export const workflowTemplates: Record<WorkflowTemplateId, WorkflowDefinition> = {
  vector: {
    id: 'template-vector',
    project_id: 'template',
    name: 'Vector RAG Template',
    description: 'Single-stage vector retrieval with optional reranking.',
    version: '0.1.0',
    architecture_type: 'vector',
    is_active: false,
    nodes: [],
    edges: [],
  },
  vectorless: {
    id: 'template-vectorless',
    project_id: 'template',
    name: 'Vectorless RAG Template',
    description: 'Metadata and lexical-based retrieval without vector index.',
    version: '0.1.0',
    architecture_type: 'vectorless',
    is_active: false,
    nodes: [],
    edges: [],
  },
  graph: {
    id: 'template-graph',
    project_id: 'template',
    name: 'Graph RAG Template',
    description: 'Entity graph traversal for relational reasoning.',
    version: '0.1.0',
    architecture_type: 'graph',
    is_active: false,
    nodes: [],
    edges: [],
  },
  temporal: {
    id: 'template-temporal',
    project_id: 'template',
    name: 'Temporal RAG Template',
    description: 'Time-aware retrieval with snapshot and timeline options.',
    version: '0.1.0',
    architecture_type: 'temporal',
    is_active: false,
    nodes: [],
    edges: [],
  },
  hybrid: {
    id: 'template-hybrid',
    project_id: 'template',
    name: 'Hybrid RAG Template',
    description: 'Hybrid vector, lexical, and graph retrieval with temporal filters.',
    version: '0.1.0',
    architecture_type: 'hybrid',
    is_active: false,
    nodes: [],
    edges: [],
  },
}

