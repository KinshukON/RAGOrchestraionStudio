import type { IntegrationCategory } from '../../api/integrations'

// ── Field types for connector-specific config forms ─────────────────────────
export type FieldType = 'text' | 'password' | 'url' | 'number' | 'select'

export type ConnectorField = {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  required?: boolean
  options?: { value: string; label: string }[]
}

export type ConnectorDef = {
  key: string
  name: string
  category: IntegrationCategory
  icon: string        // emoji for now — upgrade to SVG later
  color: string       // brand accent hex
  description: string
  fields: ConnectorField[]
}

// ── Connector registry ──────────────────────────────────────────────────────

export const CONNECTOR_REGISTRY: ConnectorDef[] = [
  // ── LLM Providers ─────────────────────────────────────────────────────────
  {
    key: 'openai',
    name: 'OpenAI',
    category: 'llm_provider',
    icon: '🤖',
    color: '#10a37f',
    description: 'GPT-4o, GPT-4, GPT-3.5 Turbo — chat, completion, and function calling.',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true },
      { key: 'organization', label: 'Organization ID', type: 'text', placeholder: 'org-...' },
      { key: 'model', label: 'Default Model', type: 'select', options: [
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      ]},
      { key: 'base_url', label: 'Base URL (optional)', type: 'url', placeholder: 'https://api.openai.com/v1' },
    ],
  },
  {
    key: 'anthropic',
    name: 'Anthropic',
    category: 'llm_provider',
    icon: '🧠',
    color: '#d97757',
    description: 'Claude 3.5 Sonnet, Claude 3 Opus, Haiku — safe, helpful AI.',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-ant-...', required: true },
      { key: 'model', label: 'Default Model', type: 'select', options: [
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
      ]},
      { key: 'max_tokens', label: 'Max Tokens', type: 'number', placeholder: '4096' },
    ],
  },
  {
    key: 'google_gemini',
    name: 'Google Gemini',
    category: 'llm_provider',
    icon: '✨',
    color: '#4285f4',
    description: 'Gemini Pro, Gemini Ultra — Google\'s multimodal models.',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'model', label: 'Default Model', type: 'select', options: [
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      ]},
      { key: 'project_id', label: 'Project ID', type: 'text', placeholder: 'my-gcp-project' },
    ],
  },
  {
    key: 'azure_openai',
    name: 'Azure OpenAI',
    category: 'llm_provider',
    icon: '☁️',
    color: '#0078d4',
    description: 'Enterprise OpenAI via Azure — private endpoints, compliance.',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'endpoint', label: 'Endpoint URL', type: 'url', placeholder: 'https://myresource.openai.azure.com/', required: true },
      { key: 'deployment_name', label: 'Deployment Name', type: 'text', required: true },
      { key: 'api_version', label: 'API Version', type: 'text', placeholder: '2024-02-15-preview' },
    ],
  },
  {
    key: 'cohere_llm',
    name: 'Cohere',
    category: 'llm_provider',
    icon: '🌀',
    color: '#39594d',
    description: 'Command R+, Command R — enterprise RAG-optimized LLMs.',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'model', label: 'Default Model', type: 'select', options: [
        { value: 'command-r-plus', label: 'Command R+' },
        { value: 'command-r', label: 'Command R' },
      ]},
    ],
  },
  {
    key: 'aws_bedrock',
    name: 'AWS Bedrock',
    category: 'llm_provider',
    icon: '🏗️',
    color: '#ff9900',
    description: 'Multi-model gateway — Claude, Titan, Mistral via AWS.',
    fields: [
      { key: 'access_key_id', label: 'Access Key ID', type: 'password', required: true },
      { key: 'secret_access_key', label: 'Secret Access Key', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1', required: true },
      { key: 'model_id', label: 'Model ID', type: 'text', placeholder: 'anthropic.claude-3-sonnet' },
    ],
  },

  // ── Embedding Providers ───────────────────────────────────────────────────
  {
    key: 'openai_embeddings',
    name: 'OpenAI Embeddings',
    category: 'embedding_provider',
    icon: '📐',
    color: '#10a37f',
    description: 'text-embedding-3-small / large — high-quality dense vectors.',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', placeholder: 'sk-...', required: true },
      { key: 'model', label: 'Model', type: 'select', options: [
        { value: 'text-embedding-3-small', label: 'text-embedding-3-small' },
        { value: 'text-embedding-3-large', label: 'text-embedding-3-large' },
        { value: 'text-embedding-ada-002', label: 'text-embedding-ada-002' },
      ]},
    ],
  },
  {
    key: 'cohere_embed',
    name: 'Cohere Embed',
    category: 'embedding_provider',
    icon: '🎯',
    color: '#39594d',
    description: 'embed-english-v3.0 / multilingual — optimized for search.',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'model', label: 'Model', type: 'select', options: [
        { value: 'embed-english-v3.0', label: 'embed-english-v3.0' },
        { value: 'embed-multilingual-v3.0', label: 'embed-multilingual-v3.0' },
      ]},
    ],
  },
  {
    key: 'huggingface',
    name: 'Hugging Face',
    category: 'embedding_provider',
    icon: '🤗',
    color: '#ffd21e',
    description: 'Inference API — thousands of open-source embedding models.',
    fields: [
      { key: 'api_key', label: 'API Token', type: 'password', required: true },
      { key: 'model_id', label: 'Model ID', type: 'text', placeholder: 'sentence-transformers/all-MiniLM-L6-v2', required: true },
    ],
  },

  // ── Rerankers ─────────────────────────────────────────────────────────────
  {
    key: 'cohere_rerank',
    name: 'Cohere Rerank',
    category: 'reranker',
    icon: '🔀',
    color: '#39594d',
    description: 'rerank-english-v3.0 — re-score retrieved passages for relevance.',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'model', label: 'Model', type: 'select', options: [
        { value: 'rerank-english-v3.0', label: 'rerank-english-v3.0' },
        { value: 'rerank-multilingual-v3.0', label: 'rerank-multilingual-v3.0' },
      ]},
    ],
  },
  {
    key: 'jina_reranker',
    name: 'Jina Reranker',
    category: 'reranker',
    icon: '⚡',
    color: '#f17b2c',
    description: 'jina-reranker-v2 — fast and accurate passage reranking.',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'model', label: 'Model', type: 'text', placeholder: 'jina-reranker-v2-base-multilingual' },
    ],
  },

  // ── Vector Databases ──────────────────────────────────────────────────────
  {
    key: 'pinecone',
    name: 'Pinecone',
    category: 'vector_db',
    icon: '🌲',
    color: '#000000',
    description: 'Managed vector DB — serverless indexes for similarity search.',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'environment', label: 'Environment', type: 'text', placeholder: 'us-east-1-aws', required: true },
      { key: 'index_name', label: 'Index Name', type: 'text', required: true },
    ],
  },
  {
    key: 'weaviate',
    name: 'Weaviate',
    category: 'vector_db',
    icon: '🔷',
    color: '#01cc74',
    description: 'Open-source vector DB — hybrid search with BM25 + vectors.',
    fields: [
      { key: 'url', label: 'Cluster URL', type: 'url', placeholder: 'https://my-cluster.weaviate.network', required: true },
      { key: 'api_key', label: 'API Key', type: 'password' },
      { key: 'class_name', label: 'Class Name', type: 'text', placeholder: 'Document' },
    ],
  },
  {
    key: 'qdrant',
    name: 'Qdrant',
    category: 'vector_db',
    icon: '🔶',
    color: '#dc244c',
    description: 'High-performance vector DB — filtering + payload storage.',
    fields: [
      { key: 'url', label: 'Cluster URL', type: 'url', placeholder: 'https://my-cluster.qdrant.io', required: true },
      { key: 'api_key', label: 'API Key', type: 'password' },
      { key: 'collection', label: 'Collection Name', type: 'text', required: true },
    ],
  },
  {
    key: 'milvus',
    name: 'Milvus',
    category: 'vector_db',
    icon: '🐬',
    color: '#00a1ea',
    description: 'Open-source vector DB — billion-scale similarity search.',
    fields: [
      { key: 'uri', label: 'URI', type: 'url', placeholder: 'http://localhost:19530', required: true },
      { key: 'token', label: 'Token', type: 'password' },
      { key: 'collection', label: 'Collection Name', type: 'text', required: true },
    ],
  },
  {
    key: 'chroma',
    name: 'Chroma',
    category: 'vector_db',
    icon: '🎨',
    color: '#f5a623',
    description: 'Lightweight embedded vector DB — great for prototyping.',
    fields: [
      { key: 'host', label: 'Host', type: 'url', placeholder: 'http://localhost:8000', required: true },
      { key: 'collection', label: 'Collection Name', type: 'text', required: true },
      { key: 'api_key', label: 'API Key (if auth enabled)', type: 'password' },
    ],
  },
  {
    key: 'pgvector',
    name: 'pgvector',
    category: 'vector_db',
    icon: '🐘',
    color: '#336791',
    description: 'PostgreSQL vector extension — vectors alongside relational data.',
    fields: [
      { key: 'connection_string', label: 'Connection String', type: 'password', placeholder: 'postgresql://user:pass@host:5432/db', required: true },
      { key: 'table_name', label: 'Table Name', type: 'text', placeholder: 'embeddings' },
    ],
  },

  // ── Graph Databases ───────────────────────────────────────────────────────
  {
    key: 'neo4j',
    name: 'Neo4j',
    category: 'graph_db',
    icon: '🕸️',
    color: '#018bff',
    description: 'Property graph DB — Cypher queries for knowledge graphs.',
    fields: [
      { key: 'uri', label: 'URI', type: 'url', placeholder: 'bolt://localhost:7687', required: true },
      { key: 'username', label: 'Username', type: 'text', placeholder: 'neo4j', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'database', label: 'Database', type: 'text', placeholder: 'neo4j' },
    ],
  },
  {
    key: 'neptune',
    name: 'Amazon Neptune',
    category: 'graph_db',
    icon: '🔱',
    color: '#ff9900',
    description: 'AWS managed graph DB — RDF or property graph queries.',
    fields: [
      { key: 'endpoint', label: 'Cluster Endpoint', type: 'url', required: true },
      { key: 'port', label: 'Port', type: 'number', placeholder: '8182' },
      { key: 'region', label: 'AWS Region', type: 'text', placeholder: 'us-east-1' },
    ],
  },
  {
    key: 'arangodb',
    name: 'ArangoDB',
    category: 'graph_db',
    icon: '🍃',
    color: '#68c294',
    description: 'Multi-model DB — documents, graphs, and key-value in one.',
    fields: [
      { key: 'url', label: 'URL', type: 'url', placeholder: 'http://localhost:8529', required: true },
      { key: 'database', label: 'Database', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text' },
      { key: 'password', label: 'Password', type: 'password' },
    ],
  },

  // ── SQL Databases ─────────────────────────────────────────────────────────
  {
    key: 'postgresql',
    name: 'PostgreSQL',
    category: 'sql_db',
    icon: '🐘',
    color: '#336791',
    description: 'Enterprise SQL — full-text search, JSON, and extensions.',
    fields: [
      { key: 'connection_string', label: 'Connection String', type: 'password', placeholder: 'postgresql://user:pass@host:5432/db', required: true },
      { key: 'schema', label: 'Schema', type: 'text', placeholder: 'public' },
    ],
  },
  {
    key: 'snowflake',
    name: 'Snowflake',
    category: 'sql_db',
    icon: '❄️',
    color: '#29b5e8',
    description: 'Cloud data warehouse — SQL analytics at scale.',
    fields: [
      { key: 'account', label: 'Account', type: 'text', placeholder: 'xy12345.us-east-1', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'warehouse', label: 'Warehouse', type: 'text' },
      { key: 'database', label: 'Database', type: 'text' },
    ],
  },

  // ── File Storage ──────────────────────────────────────────────────────────
  {
    key: 'aws_s3',
    name: 'AWS S3',
    category: 'file_storage',
    icon: '🪣',
    color: '#569a31',
    description: 'Object storage — document ingestion from S3 buckets.',
    fields: [
      { key: 'access_key_id', label: 'Access Key ID', type: 'password', required: true },
      { key: 'secret_access_key', label: 'Secret Access Key', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'text', placeholder: 'us-east-1' },
      { key: 'bucket', label: 'Bucket Name', type: 'text', required: true },
    ],
  },
  {
    key: 'gcs',
    name: 'Google Cloud Storage',
    category: 'file_storage',
    icon: '📦',
    color: '#4285f4',
    description: 'GCS — store and retrieve documents for RAG ingestion.',
    fields: [
      { key: 'project_id', label: 'Project ID', type: 'text', required: true },
      { key: 'credentials_json', label: 'Service Account JSON', type: 'password', placeholder: '{"type":"service_account",...}', required: true },
      { key: 'bucket', label: 'Bucket Name', type: 'text', required: true },
    ],
  },
  {
    key: 'azure_blob',
    name: 'Azure Blob Storage',
    category: 'file_storage',
    icon: '💎',
    color: '#0078d4',
    description: 'Azure Blob — enterprise document storage with SAS access.',
    fields: [
      { key: 'connection_string', label: 'Connection String', type: 'password', required: true },
      { key: 'container', label: 'Container Name', type: 'text', required: true },
    ],
  },

  // ── Document Repositories ─────────────────────────────────────────────────
  {
    key: 'confluence',
    name: 'Confluence',
    category: 'document_repository',
    icon: '📘',
    color: '#1868db',
    description: 'Atlassian Confluence — ingest wiki pages and spaces.',
    fields: [
      { key: 'base_url', label: 'Instance URL', type: 'url', placeholder: 'https://mycompany.atlassian.net', required: true },
      { key: 'username', label: 'Email', type: 'text', required: true },
      { key: 'api_token', label: 'API Token', type: 'password', required: true },
      { key: 'space_key', label: 'Space Key', type: 'text', placeholder: 'ENG' },
    ],
  },
  {
    key: 'notion',
    name: 'Notion',
    category: 'document_repository',
    icon: '📝',
    color: '#000000',
    description: 'Notion — pull pages and databases for knowledge ingestion.',
    fields: [
      { key: 'api_key', label: 'Integration Token', type: 'password', required: true },
      { key: 'root_page_id', label: 'Root Page ID (optional)', type: 'text' },
    ],
  },
  {
    key: 'sharepoint',
    name: 'SharePoint',
    category: 'document_repository',
    icon: '📋',
    color: '#038387',
    description: 'Microsoft SharePoint — pull documents from sites and lists.',
    fields: [
      { key: 'site_url', label: 'Site URL', type: 'url', required: true },
      { key: 'client_id', label: 'Client ID', type: 'text', required: true },
      { key: 'client_secret', label: 'Client Secret', type: 'password', required: true },
      { key: 'tenant_id', label: 'Tenant ID', type: 'text', required: true },
    ],
  },

  // ── Logging & Monitoring ──────────────────────────────────────────────────
  {
    key: 'datadog',
    name: 'Datadog',
    category: 'logging_monitoring',
    icon: '🐕',
    color: '#632ca6',
    description: 'Datadog — send RAG traces and metrics for observability.',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
      { key: 'site', label: 'Site', type: 'select', options: [
        { value: 'datadoghq.com', label: 'US (datadoghq.com)' },
        { value: 'datadoghq.eu', label: 'EU (datadoghq.eu)' },
        { value: 'us3.datadoghq.com', label: 'US3' },
        { value: 'us5.datadoghq.com', label: 'US5' },
      ]},
    ],
  },
  {
    key: 'grafana',
    name: 'Grafana',
    category: 'logging_monitoring',
    icon: '📊',
    color: '#f46800',
    description: 'Grafana — visualize RAG pipeline metrics and dashboards.',
    fields: [
      { key: 'url', label: 'Instance URL', type: 'url', required: true },
      { key: 'api_key', label: 'API Key', type: 'password', required: true },
    ],
  },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<string, string> = {
  llm_provider: 'LLM Providers',
  embedding_provider: 'Embedding Providers',
  reranker: 'Rerankers',
  vector_db: 'Vector Databases',
  graph_db: 'Graph Databases',
  sql_db: 'SQL Databases',
  file_storage: 'File Storage',
  document_repository: 'Document Sources',
  identity_provider: 'Identity Providers',
  logging_monitoring: 'Logging & Monitoring',
  email: 'Email',
  enterprise_app: 'Enterprise Apps',
  api: 'API',
}

/** Category display order */
export const CATEGORY_ORDER: string[] = [
  'llm_provider',
  'embedding_provider',
  'reranker',
  'vector_db',
  'graph_db',
  'sql_db',
  'file_storage',
  'document_repository',
  'logging_monitoring',
  'enterprise_app',
  'identity_provider',
  'api',
  'email',
]

/** Group connectors by category in display order */
export function groupByCategory() {
  const groups: { category: string; label: string; connectors: ConnectorDef[] }[] = []
  const byCategory = new Map<string, ConnectorDef[]>()

  for (const c of CONNECTOR_REGISTRY) {
    const list = byCategory.get(c.category) ?? []
    list.push(c)
    byCategory.set(c.category, list)
  }

  for (const cat of CATEGORY_ORDER) {
    const connectors = byCategory.get(cat)
    if (connectors && connectors.length > 0) {
      groups.push({
        category: cat,
        label: CATEGORY_LABELS[cat] ?? cat,
        connectors,
      })
    }
  }

  return groups
}

export function getConnector(key: string): ConnectorDef | undefined {
  return CONNECTOR_REGISTRY.find(c => c.key === key)
}
