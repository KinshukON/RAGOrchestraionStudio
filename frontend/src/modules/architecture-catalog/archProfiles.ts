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
  agentic: {
    opsComplexity: 'Very High',
    opsComplexityNote: 'Agent loops with dynamic tool calls — hard to predict cost and latency; needs robust guardrails.',
    estimatedSetupDays: 10,
    costTier: 'High',
    useCases: ['Personal assistants', 'Research aids', 'Customer service bots needing dynamic interaction'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI GPT-4, Anthropic, Gemini',  required: true  },
      { category: 'vector_db',          label: 'Vector Store',        examples: 'pgvector, Pinecone, Qdrant',       required: true  },
      { category: 'embedding_provider', label: 'Embedding Provider', examples: 'OpenAI, Cohere, BGE',              required: true  },
      { category: 'file_storage',       label: 'Document Source',     examples: 'S3, GCS, SharePoint',              required: true  },
      { category: 'logging_monitoring', label: 'Observability',       examples: 'Datadog, CloudWatch',              required: true  },
    ],
  },
  modular: {
    opsComplexity: 'High',
    opsComplexityNote: 'Independent modules need service mesh, container orchestration, and interface contracts.',
    estimatedSetupDays: 10,
    costTier: 'Medium',
    useCases: ['Large collaborative projects', 'Systems needing frequent updates', 'Microservices-based RAG'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI, Anthropic, Gemini',    required: true  },
      { category: 'embedding_provider', label: 'Embedding Provider', examples: 'OpenAI, Cohere, BGE',          required: true  },
      { category: 'vector_db',          label: 'Vector Store',        examples: 'pgvector, Pinecone, Qdrant',   required: true  },
      { category: 'file_storage',       label: 'Document Source',     examples: 'S3, GCS, SharePoint',          required: true  },
      { category: 'logging_monitoring', label: 'Observability',       examples: 'Datadog, CloudWatch',          required: false },
    ],
  },
  memory_augmented: {
    opsComplexity: 'High',
    opsComplexityNote: 'Requires external memory store management, session persistence, and pruning strategies.',
    estimatedSetupDays: 7,
    costTier: 'Medium',
    useCases: ['Chatbots with long-term context', 'Personalized recommendations', 'User-adaptive assistants'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI, Anthropic, Gemini',    required: true  },
      { category: 'vector_db',          label: 'Vector Store',        examples: 'Pinecone, pgvector, Qdrant',   required: true  },
      { category: 'sql_db',             label: 'Memory Store',        examples: 'Redis, DynamoDB, PostgreSQL',  required: true  },
      { category: 'embedding_provider', label: 'Embedding Provider', examples: 'OpenAI, Cohere, BGE',          required: true  },
      { category: 'logging_monitoring', label: 'Observability',       examples: 'Datadog, CloudWatch',          required: false },
    ],
  },
  multimodal: {
    opsComplexity: 'Very High',
    opsComplexityNote: 'Cross-modal alignment models are compute-heavy; need GPU infrastructure and multi-modal indexes.',
    estimatedSetupDays: 14,
    costTier: 'High',
    useCases: ['Image captioning', 'Video summarization', 'Multi-modal assistants'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI GPT-4V, Gemini Pro Vision',  required: true  },
      { category: 'embedding_provider', label: 'Embedding Provider', examples: 'OpenAI CLIP, Cohere',               required: true  },
      { category: 'vector_db',          label: 'Vector Store',        examples: 'pgvector, Pinecone, Qdrant',        required: true  },
      { category: 'file_storage',       label: 'Media Source',        examples: 'S3, GCS, Azure Blob',               required: true  },
      { category: 'logging_monitoring', label: 'Observability',       examples: 'Datadog, CloudWatch',               required: false },
    ],
  },
  federated: {
    opsComplexity: 'Very High',
    opsComplexityNote: 'Cross-org data governance, network security, and distributed query routing require specialized infra.',
    estimatedSetupDays: 21,
    costTier: 'High',
    useCases: ['Healthcare data sharing', 'Cross-organization collaboration', 'Regulatory-compliant retrieval'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI, Anthropic, Gemini',    required: true  },
      { category: 'vector_db',          label: 'Vector Store',        examples: 'pgvector, Pinecone, Qdrant',   required: true  },
      { category: 'embedding_provider', label: 'Embedding Provider', examples: 'OpenAI, Cohere, BGE',          required: true  },
      { category: 'file_storage',       label: 'Document Source',     examples: 'S3, GCS, SharePoint',          required: true  },
      { category: 'logging_monitoring', label: 'Observability',       examples: 'Datadog, CloudWatch',          required: true  },
    ],
  },
  streaming: {
    opsComplexity: 'Very High',
    opsComplexityNote: 'Requires stream processing pipeline (Kafka/Kinesis), real-time indexing, and event ordering.',
    estimatedSetupDays: 14,
    costTier: 'High',
    useCases: ['Live reporting', 'Financial tickers', 'Social media monitoring', 'Real-time alerting'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI, Anthropic, Gemini',    required: true  },
      { category: 'embedding_provider', label: 'Embedding Provider', examples: 'OpenAI, Cohere, BGE',          required: true  },
      { category: 'vector_db',          label: 'Vector Store',        examples: 'pgvector, Pinecone, Qdrant',   required: true  },
      { category: 'file_storage',       label: 'Stream Source',       examples: 'Kafka, Kinesis, Pub/Sub',      required: true  },
      { category: 'logging_monitoring', label: 'Observability',       examples: 'Datadog, CloudWatch',          required: true  },
    ],
  },
  contextual: {
    opsComplexity: 'Medium',
    opsComplexityNote: 'Session state management and conversation history indexing add moderate overhead.',
    estimatedSetupDays: 5,
    costTier: 'Medium',
    useCases: ['Conversational AI', 'Customer support chatbots', 'Session-aware assistants'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI, Anthropic, Gemini',    required: true  },
      { category: 'vector_db',          label: 'Vector Store',        examples: 'pgvector, Pinecone, Qdrant',   required: true  },
      { category: 'embedding_provider', label: 'Embedding Provider', examples: 'OpenAI, Cohere, BGE',          required: true  },
      { category: 'sql_db',             label: 'Session Store',       examples: 'Redis, PostgreSQL, DynamoDB',  required: true  },
      { category: 'logging_monitoring', label: 'Observability',       examples: 'Datadog, CloudWatch',          required: false },
    ],
  },
  knowledge_enhanced: {
    opsComplexity: 'High',
    opsComplexityNote: 'Requires ontology curation, knowledge graph maintenance, and domain expert involvement.',
    estimatedSetupDays: 12,
    costTier: 'High',
    useCases: ['Educational tools', 'Professional domain apps (legal, medical)', 'Expert systems'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI, Anthropic, Gemini',    required: true  },
      { category: 'graph_db',           label: 'Knowledge Graph',     examples: 'Neo4j, Apache Jena, Stardog',  required: true  },
      { category: 'embedding_provider', label: 'Embedding Provider', examples: 'OpenAI, Cohere, BGE',          required: true  },
      { category: 'file_storage',       label: 'Document Source',     examples: 'S3, GCS, SharePoint',          required: true  },
      { category: 'logging_monitoring', label: 'Observability',       examples: 'Datadog, CloudWatch',          required: false },
    ],
  },
  self_rag: {
    opsComplexity: 'High',
    opsComplexityNote: 'Self-evaluation loops add compute cost and implementation complexity; needs quality calibration.',
    estimatedSetupDays: 7,
    costTier: 'Medium',
    useCases: ['Content creation tools', 'High-accuracy educational platforms', 'Fact-checking pipelines'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI, Anthropic, Gemini',    required: true  },
      { category: 'embedding_provider', label: 'Embedding Provider', examples: 'OpenAI, Cohere, BGE',          required: true  },
      { category: 'vector_db',          label: 'Vector Store',        examples: 'pgvector, Pinecone, Qdrant',   required: true  },
      { category: 'file_storage',       label: 'Document Source',     examples: 'S3, GCS, SharePoint',          required: true  },
      { category: 'logging_monitoring', label: 'Observability',       examples: 'Datadog, CloudWatch',          required: false },
    ],
  },
  hyde: {
    opsComplexity: 'Medium',
    opsComplexityNote: 'Extra LLM call per query for hypothesis generation; otherwise standard vector RAG infra.',
    estimatedSetupDays: 4,
    costTier: 'Medium',
    useCases: ['Complex queries with implicit meaning', 'Niche research fields', 'Academic search'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI, Anthropic, Gemini',    required: true  },
      { category: 'embedding_provider', label: 'Embedding Provider', examples: 'OpenAI, Cohere, BGE',          required: true  },
      { category: 'vector_db',          label: 'Vector Store',        examples: 'pgvector, Pinecone, Qdrant',   required: true  },
      { category: 'file_storage',       label: 'Document Source',     examples: 'S3, GCS, SharePoint',          required: true  },
    ],
  },
  recursive: {
    opsComplexity: 'Very High',
    opsComplexityNote: 'Multiple retrieval + generation rounds per query; cost and latency scale with depth.',
    estimatedSetupDays: 10,
    costTier: 'High',
    useCases: ['Analytical & problem-solving tasks', 'Multi-turn dialogue systems', 'Deep research'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI, Anthropic, Gemini',    required: true  },
      { category: 'embedding_provider', label: 'Embedding Provider', examples: 'OpenAI, Cohere, BGE',          required: true  },
      { category: 'vector_db',          label: 'Vector Store',        examples: 'pgvector, Pinecone, Qdrant',   required: true  },
      { category: 'file_storage',       label: 'Document Source',     examples: 'S3, GCS, SharePoint',          required: true  },
      { category: 'logging_monitoring', label: 'Observability',       examples: 'Datadog, CloudWatch',          required: true  },
    ],
  },
  domain_specific: {
    opsComplexity: 'High',
    opsComplexityNote: 'Requires domain expert curation, regulatory compliance checks, and specialized evaluation.',
    estimatedSetupDays: 14,
    costTier: 'High',
    useCases: ['Legal research assistants', 'Medical diagnosis support', 'Financial analysis tools'],
    integrations: [
      { category: 'llm_provider',       label: 'LLM Provider',       examples: 'OpenAI, Anthropic, Gemini',    required: true  },
      { category: 'embedding_provider', label: 'Embedding Provider', examples: 'OpenAI, Cohere, BGE',          required: true  },
      { category: 'vector_db',          label: 'Vector Store',        examples: 'pgvector, Pinecone, Qdrant',   required: true  },
      { category: 'file_storage',       label: 'Document Source',     examples: 'S3, GCS, SharePoint',          required: true  },
      { category: 'sql_db',             label: 'Domain DB',           examples: 'PostgreSQL, MongoDB, custom',  required: true  },
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
