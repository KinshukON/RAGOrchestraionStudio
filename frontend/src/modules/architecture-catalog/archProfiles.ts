/**
 * Canonical per-architecture integration requirements and operational metadata.
 * Used by: ArchitectureCatalogPage (catalog cards), ArchitectAdvisor (result card),
 * and future integration readiness checks.
 */

export interface ArchRequirement {
  /** Integration category from IntegrationCategory type */
  category: string
  /** Display name shown in UI */
  label: string
  /** Example providers for tooltip */
  examples: string
  required: boolean
}

export interface ArchProfile {
  opsComplexity: 'Low' | 'Medium' | 'High' | 'Very High'
  opsComplexityNote: string
  estimatedSetupDays: number
  integrations: ArchRequirement[]
  /** Rough cost tier vs other arches */
  costTier: 'Low' | 'Medium' | 'High'
  /** Key commercial use cases */
  useCases: string[]
}

export const ARCH_PROFILES: Record<string, ArchProfile> = {
  vector: {
    opsComplexity: 'Medium',
    opsComplexityNote: 'Requires embedding pipeline maintenance and vector index updates as data changes.',
    estimatedSetupDays: 3,
    costTier: 'Medium',
    useCases: ['Support deflection', 'Product knowledge search', 'Enterprise knowledge assistant'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI, Anthropic, Gemini',    required: true  },
      { category: 'embedding_provider', label: 'Embedding Provider', examples: 'OpenAI, Cohere, BGE',          required: true  },
      { category: 'vector_db',          label: 'Vector Store',        examples: 'pgvector, Pinecone, Qdrant',   required: true  },
      { category: 'file_storage',       label: 'Document Source',     examples: 'S3, GCS, SharePoint',          required: true  },
      { category: 'reranker',           label: 'Reranker',            examples: 'Cohere, Jina, FlashRank',      required: false },
      { category: 'logging_monitoring', label: 'Observability',       examples: 'Datadog, CloudWatch',          required: false },
    ],
  },
  vectorless: {
    opsComplexity: 'Low',
    opsComplexityNote: 'No embedding model to maintain. Relies on structured schemas and BM25 indexes.',
    estimatedSetupDays: 2,
    costTier: 'Low',
    useCases: ['Contract lookup', 'Policy & SOP search', 'Regulatory documentation'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI, Anthropic, Gemini',    required: true  },
      { category: 'sql_db',             label: 'Search Backend',      examples: 'Elasticsearch, Typesense, Solr', required: true },
      { category: 'file_storage',       label: 'Document Source',     examples: 'S3, GCS, SharePoint',          required: true  },
      { category: 'logging_monitoring', label: 'Observability',       examples: 'Datadog, CloudWatch',          required: false },
    ],
  },
  graph: {
    opsComplexity: 'Very High',
    opsComplexityNote: 'Requires knowledge graph construction, entity extraction, and graph DB management.',
    estimatedSetupDays: 10,
    costTier: 'High',
    useCases: ['Cybersecurity investigations', 'Fraud & supply chain reasoning', 'Customer 360'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI, Anthropic, Gemini',    required: true  },
      { category: 'graph_db',           label: 'Graph Database',      examples: 'Neo4j, Amazon Neptune, ArangoDB', required: true },
      { category: 'embedding_provider', label: 'Embedding Provider', examples: 'OpenAI, Cohere, BGE',          required: true  },
      { category: 'vector_db',          label: 'Vector Store',        examples: 'pgvector, Pinecone, Qdrant',   required: false },
      { category: 'file_storage',       label: 'Document Source',     examples: 'S3, GCS, SharePoint',          required: true  },
      { category: 'logging_monitoring', label: 'Observability',       examples: 'Datadog, CloudWatch',          required: false },
    ],
  },
  temporal: {
    opsComplexity: 'High',
    opsComplexityNote: 'Time-partitioned indexes and effective-date tracking add significant operational overhead.',
    estimatedSetupDays: 7,
    costTier: 'Medium',
    useCases: ['Policy versioning', 'Incident timelines', 'Regulatory audit & review'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI, Anthropic, Gemini',    required: true  },
      { category: 'embedding_provider', label: 'Embedding Provider', examples: 'OpenAI, Cohere, BGE',          required: true  },
      { category: 'vector_db',          label: 'Vector Store',        examples: 'pgvector, Pinecone, Qdrant',   required: true  },
      { category: 'sql_db',             label: 'Temporal Store',      examples: 'PostgreSQL, TimescaleDB',      required: true  },
      { category: 'file_storage',       label: 'Document Source',     examples: 'S3, GCS, SharePoint',          required: true  },
      { category: 'logging_monitoring', label: 'Observability',       examples: 'Datadog, CloudWatch',          required: false },
    ],
  },
  hybrid: {
    opsComplexity: 'Very High',
    opsComplexityNote: 'Runs multiple retrieval strategies in parallel — requires all supporting infra across vector, lexical, and graph.',
    estimatedSetupDays: 14,
    costTier: 'High',
    useCases: ['Enterprise-scale mixed workloads', 'No single-retriever bet-the-company strategy'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI, Anthropic, Gemini',    required: true  },
      { category: 'embedding_provider', label: 'Embedding Provider', examples: 'OpenAI, Cohere, BGE',          required: true  },
      { category: 'vector_db',          label: 'Vector Store',        examples: 'pgvector, Pinecone, Qdrant',   required: true  },
      { category: 'sql_db',             label: 'Lexical Search',      examples: 'Elasticsearch, Typesense',     required: true  },
      { category: 'reranker',           label: 'Reranker',            examples: 'Cohere, Jina, FlashRank',      required: true  },
      { category: 'file_storage',       label: 'Document Source',     examples: 'S3, GCS, SharePoint',          required: true  },
      { category: 'graph_db',           label: 'Graph Database',      examples: 'Neo4j, Neptune, ArangoDB',     required: false },
      { category: 'logging_monitoring', label: 'Observability',       examples: 'Datadog, CloudWatch',          required: false },
    ],
  },
  custom: {
    opsComplexity: 'High',
    opsComplexityNote: 'Bespoke orchestration — operational complexity depends on the specific pipeline design.',
    estimatedSetupDays: 7,
    costTier: 'Medium',
    useCases: ['Expansion revenue', 'Services-led deployment', 'Advanced enterprise pipelines'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI, Anthropic, Gemini',    required: true  },
      { category: 'vector_db',          label: 'Vector Store',        examples: 'pgvector, Pinecone, Qdrant',   required: false },
      { category: 'file_storage',       label: 'Document Source',     examples: 'S3, GCS, SharePoint',          required: false },
      { category: 'logging_monitoring', label: 'Observability',       examples: 'Datadog, CloudWatch',          required: false },
    ],
  },
}

export const COMPLEXITY_COLOR: Record<string, string> = {
  'Low':       'success',
  'Medium':    'info',
  'High':      'warning',
  'Very High': 'danger',
}
