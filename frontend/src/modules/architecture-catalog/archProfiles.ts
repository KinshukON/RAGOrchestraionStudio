/**
 * Canonical per-architecture integration requirements, operational metadata,
 * and commercial identity.
 * Used by: ArchitectureCatalogPage (catalog cards), ArchitectAdvisor (result card),
 * RequiredIntegrationsPanel, and cost/readiness checks.
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
  // ── Commercial identity (Sprint 6) ──────────────────────────────────────
  /** One-line buyer-facing outcome badge, e.g. "Best for compliance Q&A" */
  businessOutcome: string
  /** Governance characteristics, e.g. "High explainability, deterministic" */
  governancePosture: string
  /** Benchmark pack identity, e.g. "Precision / explainability pack" */
  benchmarkIdentity: string
  /** Who should pick this arch, e.g. "Regulated enterprises seeking deterministic retrieval" */
  recommendedFor: string
  /** Progressive-disclosure tier */
  tier: 'core' | 'advanced' | 'specialized'
  /** Why a buyer should care — one-line financial/strategic hook */
  whyItWins: string
}

export const ARCH_PROFILES: Record<string, ArchProfile> = {
  vector: {
    opsComplexity: 'Medium',
    opsComplexityNote: 'Requires embedding pipeline maintenance and vector index updates as data changes.',
    estimatedSetupDays: 3,
    costTier: 'Medium',
    useCases: ['Support deflection', 'Product knowledge search', 'Enterprise knowledge assistant'],
    businessOutcome: 'Best for broad semantic search',
    governancePosture: 'Standard — semantic similarity scoring with configurable thresholds',
    benchmarkIdentity: 'Recall-heavy semantic match pack',
    recommendedFor: 'Teams needing flexible knowledge retrieval across large unstructured corpora',
    tier: 'core',
    whyItWins: 'Most versatile starting point — proven at scale with the broadest vendor ecosystem',
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
    businessOutcome: 'Best for compliance & policy lookup',
    governancePosture: 'High explainability — deterministic keyword matching, fully auditable results',
    benchmarkIdentity: 'Precision / explainability pack',
    recommendedFor: 'Regulated enterprises seeking deterministic, auditable retrieval at minimal cost',
    tier: 'core',
    whyItWins: 'Cheapest and most auditable retrieval — zero embedding cost, fully deterministic results',
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
    businessOutcome: 'Best for investigations & entity reasoning',
    governancePosture: 'Entity/path validation — requires graph integrity checks and traversal auditing',
    benchmarkIdentity: 'Multi-hop reasoning pack',
    recommendedFor: 'Organizations needing relationship-aware answers across interconnected data',
    tier: 'core',
    whyItWins: 'Only architecture that resolves multi-hop entity questions — critical for fraud, security, and supply chain',
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
    businessOutcome: 'Best for audit trails & versioned records',
    governancePosture: 'Freshness/versioning checks — enforces temporal validity and point-in-time accuracy',
    benchmarkIdentity: 'As-of-date / version consistency pack',
    recommendedFor: 'Compliance teams requiring time-valid answers and audit-grade traceability',
    tier: 'core',
    whyItWins: 'Only architecture that guarantees temporally valid answers — prevents stale data from reaching users',
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
    businessOutcome: 'Recommended enterprise default for mixed workloads',
    governancePosture: 'Routing transparency — requires strategy-selection auditing and fusion scoring thresholds',
    benchmarkIdentity: 'Mixed-workload fusion pack',
    recommendedFor: 'Enterprises that cannot bet on one retrieval primitive and need broad, reliable coverage',
    tier: 'core',
    whyItWins: 'Highest overall accuracy by fusing multiple signals — the safest enterprise-scale choice',
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
    businessOutcome: 'Best for bespoke enterprise pipelines',
    governancePosture: 'Custom — governance profile depends on the specific orchestration design',
    benchmarkIdentity: 'Custom evaluation suite',
    recommendedFor: 'Organizations with unique retrieval requirements that don\'t fit standard patterns',
    tier: 'advanced',
    whyItWins: 'Maximum flexibility — build exactly the pipeline your use case demands',
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
    businessOutcome: 'Best for autonomous research & dynamic workflows',
    governancePosture: 'Guardrail-heavy — requires tool-call budgets, loop limits, and action auditing',
    benchmarkIdentity: 'Agent autonomy / tool-call efficiency pack',
    recommendedFor: 'Teams building autonomous AI assistants that need to take actions, not just answer questions',
    tier: 'advanced',
    whyItWins: 'Only architecture that can dynamically choose tools and chain actions — true AI autonomy',
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
    businessOutcome: 'Best for large teams with independent release cycles',
    governancePosture: 'Contract-based — each module has independent quality gates and interface contracts',
    benchmarkIdentity: 'Module isolation / integration stability pack',
    recommendedFor: 'Engineering organizations with multiple teams contributing to the retrieval pipeline',
    tier: 'advanced',
    whyItWins: 'Independent module deployment means faster iteration with lower blast radius',
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
    businessOutcome: 'Best for personalized & context-aware assistants',
    governancePosture: 'Privacy-sensitive — user memory stores require data retention policies and purging',
    benchmarkIdentity: 'Long-term context retention / personalization pack',
    recommendedFor: 'Products where user context improves answer quality over time',
    tier: 'advanced',
    whyItWins: 'Answers improve with every interaction — builds competitive moat through personalization',
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
    businessOutcome: 'Best for image, video & cross-modal search',
    governancePosture: 'Compute-aware — requires GPU budgets, model versioning, and content safety filters',
    benchmarkIdentity: 'Cross-modal alignment / visual Q&A pack',
    recommendedFor: 'Teams whose data includes images, videos, or mixed media alongside text',
    tier: 'specialized',
    whyItWins: 'Only architecture that searches across text, images, and video in one query',
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
    businessOutcome: 'Best for cross-org data sharing with privacy',
    governancePosture: 'Privacy/data locality rules — each data source retains sovereignty and access control',
    benchmarkIdentity: 'Privacy-preserving answer validity pack',
    recommendedFor: 'Multi-organization environments where data cannot leave its origin (healthcare, government)',
    tier: 'specialized',
    whyItWins: 'Enables retrieval across organizational boundaries without centralizing sensitive data',
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
    businessOutcome: 'Best for real-time data & live event streams',
    governancePosture: 'Event-ordering guarantees — requires exactly-once processing and stream position auditing',
    benchmarkIdentity: 'Real-time freshness / event ordering pack',
    recommendedFor: 'Use cases where answers must reflect data from the last few seconds or minutes',
    tier: 'specialized',
    whyItWins: 'Only architecture that retrieves from live event streams — critical for financial and operational data',
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
    businessOutcome: 'Best for conversational & session-aware AI',
    governancePosture: 'Session-scoped — conversation history requires retention policies and PII handling',
    benchmarkIdentity: 'Conversation continuity / session accuracy pack',
    recommendedFor: 'Chat-first products where conversation context dramatically improves answer quality',
    tier: 'advanced',
    whyItWins: 'Understands conversation context — eliminates the "repeat yourself" problem in AI chat',
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
    businessOutcome: 'Best for expert-grade domain Q&A',
    governancePosture: 'Domain-authority — requires ontology version control and expert-reviewed knowledge updates',
    benchmarkIdentity: 'Domain precision / expert validation pack',
    recommendedFor: 'Industries where answers must meet professional standards (legal, medical, engineering)',
    tier: 'specialized',
    whyItWins: 'Combines knowledge graph authority with LLM fluency — expert-grade answers at scale',
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
    businessOutcome: 'Best for self-correcting, high-accuracy retrieval',
    governancePosture: 'Quality-gated — self-evaluation scores must pass thresholds before answer delivery',
    benchmarkIdentity: 'Self-correction accuracy / hallucination reduction pack',
    recommendedFor: 'Use cases where wrong answers have material consequences (publishing, education, fact-checking)',
    tier: 'specialized',
    whyItWins: 'Built-in quality gate — the model catches and corrects its own retrieval errors before responding',
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
    businessOutcome: 'Best for ambiguous & exploratory queries',
    governancePosture: 'Standard + hypothesis auditing — generated hypotheses should be logged for review',
    benchmarkIdentity: 'Hypothesis quality / retrieval lift pack',
    recommendedFor: 'Research-heavy domains where queries are vague and users expect the system to "figure it out"',
    tier: 'specialized',
    whyItWins: 'Turns vague questions into precise retrieval — dramatically improves recall on ambiguous queries',
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
    businessOutcome: 'Best for deep research & analytical tasks',
    governancePosture: 'Depth-limited — requires max iteration limits, cost ceilings, and intermediate auditing',
    benchmarkIdentity: 'Iterative depth / answer completeness pack',
    recommendedFor: 'Use cases where a single retrieval pass is insufficient and answers require synthesis across multiple rounds',
    tier: 'specialized',
    whyItWins: 'Iteratively deepens understanding — produces the most thorough answers for complex analytical questions',
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
    businessOutcome: 'Best for regulated industry verticals',
    governancePosture: 'Compliance-first — requires domain-specific validation rules, expert review, and regulatory checks',
    benchmarkIdentity: 'Domain accuracy / regulatory compliance pack',
    recommendedFor: 'Highly regulated industries (legal, medical, financial) requiring domain-specific accuracy guarantees',
    tier: 'specialized',
    whyItWins: 'Purpose-built for regulated industries — domain-tuned retrieval with compliance guardrails',
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

export const TIER_ORDER: Record<string, number> = { core: 0, advanced: 1, specialized: 2 }
export const TIER_LABEL: Record<string, string> = { core: 'Core', advanced: 'Advanced', specialized: 'Specialized' }
