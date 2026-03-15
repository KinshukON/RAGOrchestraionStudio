import type { Node } from 'reactflow'
import type { NodeType } from '../../api/workflows'
import './workflow-builder.css'

export type NodeUpdatePatch = { config?: Record<string, unknown>; label?: string }

type NodeConfigPanelProps = {
  node: Node | null
  onNodeUpdate: (nodeId: string, patch: NodeUpdatePatch) => void
}

const NODE_LABELS: Record<string, string> = {
  input_query: 'User query',
  query_classifier: 'Query classifier',
  intent_detector: 'Intent detector',
  embedding_generator: 'Embedding generator',
  vector_retriever: 'Vector retriever',
  lexical_retriever: 'Lexical retriever',
  metadata_filter: 'Metadata filter',
  graph_retriever: 'Graph retriever',
  temporal_filter: 'Temporal filter',
  reranker: 'Reranker',
  context_assembler: 'Context assembler',
  prompt_constructor: 'Prompt constructor',
  llm_answer_generator: 'Answer generator',
  guardrail: 'Guardrail',
  fallback_route: 'Fallback route',
}

// ─── Shared select + number + text atoms ────────────────────────────────────

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="wf-config-field-label">
      {label}
      {hint && <span className="wf-config-field-hint" title={hint}> ⓘ</span>}
    </span>
  )
}

function SelectField({
  label, hint, configKey, value, options, onChange,
}: {
  label: string; hint?: string; configKey: string
  value: string; options: { value: string; label: string }[]
  onChange: (key: string, val: unknown) => void
}) {
  return (
    <label className="wf-config-field">
      <FieldLabel label={label} hint={hint} />
      <select value={value} onChange={(e) => onChange(configKey, e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

function NumberField({
  label, hint, configKey, value, min, max, step, onChange,
}: {
  label: string; hint?: string; configKey: string
  value: number; min?: number; max?: number; step?: number
  onChange: (key: string, val: unknown) => void
}) {
  return (
    <label className="wf-config-field">
      <FieldLabel label={label} hint={hint} />
      <div className="wf-config-slider-row">
        <input
          type="range" min={min ?? 1} max={max ?? 100} step={step ?? 1}
          value={value}
          onChange={(e) => onChange(configKey, Number(e.target.value))}
        />
        <input
          type="number" min={min ?? 1} max={max ?? 100} step={step ?? 1}
          value={value}
          onChange={(e) => onChange(configKey, Number(e.target.value) || (min ?? 1))}
          className="wf-config-num-input"
        />
      </div>
    </label>
  )
}

function TextField({
  label, hint, configKey, value, placeholder, onChange,
}: {
  label: string; hint?: string; configKey: string
  value: string; placeholder?: string
  onChange: (key: string, val: unknown) => void
}) {
  return (
    <label className="wf-config-field">
      <FieldLabel label={label} hint={hint} />
      <input
        type="text" value={value} placeholder={placeholder}
        onChange={(e) => onChange(configKey, e.target.value)}
      />
    </label>
  )
}

function ToggleField({
  label, hint, configKey, value, onChange,
}: {
  label: string; hint?: string; configKey: string; value: boolean
  onChange: (key: string, val: unknown) => void
}) {
  return (
    <label className="wf-config-field wf-config-field--toggle">
      <FieldLabel label={label} hint={hint} />
      <input
        type="checkbox" checked={value}
        onChange={(e) => onChange(configKey, e.target.checked)}
      />
    </label>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <p className="wf-config-section-header">{title}</p>
}

// ─── Per-node deep config renderers ─────────────────────────────────────────

function EmbeddingGeneratorConfig({ cfg, update }: { cfg: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <SectionHeader title="Chunking" />
      <SelectField label="Chunking strategy" hint="How source documents are split before embedding"
        configKey="chunk_strategy" value={String(cfg.chunk_strategy ?? 'recursive')}
        options={[
          { value: 'recursive', label: 'Recursive character split' },
          { value: 'sentence', label: 'Sentence boundary' },
          { value: 'semantic', label: 'Semantic (embedding-guided)' },
          { value: 'fixed', label: 'Fixed token window' },
          { value: 'paragraph', label: 'Paragraph / markdown header' },
          { value: 'sliding_window', label: 'Sliding window (with overlap)' },
        ]}
        onChange={update}
      />
      <NumberField label="Chunk size (tokens)" hint="Target token length per chunk"
        configKey="chunk_size" value={Number(cfg.chunk_size ?? 512)}
        min={64} max={4096} step={64} onChange={update}
      />
      <NumberField label="Chunk overlap (tokens)" hint="Token overlap between consecutive chunks to preserve context"
        configKey="chunk_overlap" value={Number(cfg.chunk_overlap ?? 64)}
        min={0} max={512} step={16} onChange={update}
      />
      <SectionHeader title="Embedding model" />
      <SelectField label="Embedding model" hint="Model used to convert chunks into vectors"
        configKey="embedding_model" value={String(cfg.embedding_model ?? 'text-embedding-3-large')}
        options={[
          { value: 'text-embedding-3-large', label: 'OpenAI text-embedding-3-large (3072d)' },
          { value: 'text-embedding-3-small', label: 'OpenAI text-embedding-3-small (1536d)' },
          { value: 'text-embedding-ada-002', label: 'OpenAI ada-002 (1536d)' },
          { value: 'cohere-embed-english-v3', label: 'Cohere embed-english-v3.0 (1024d)' },
          { value: 'bge-large-en-v1.5', label: 'BGE-large-en-v1.5 (1024d, open)' },
          { value: 'e5-mistral-7b', label: 'E5-Mistral-7B (4096d, open)' },
          { value: 'custom', label: 'Custom endpoint' },
        ]}
        onChange={update}
      />
      {String(cfg.embedding_model ?? '') === 'custom' && (
        <TextField label="Custom model endpoint" configKey="custom_embedding_url"
          value={String(cfg.custom_embedding_url ?? '')} placeholder="https://..."
          onChange={update}
        />
      )}
      <NumberField label="Batch size" hint="Chunks embedded per API call"
        configKey="embed_batch_size" value={Number(cfg.embed_batch_size ?? 64)}
        min={1} max={512} step={16} onChange={update}
      />
      <SectionHeader title="Storage" />
      <SelectField label="Vector store" hint="Where embeddings are stored and indexed"
        configKey="vector_store" value={String(cfg.vector_store ?? 'pgvector')}
        options={[
          { value: 'pgvector', label: 'pgvector (PostgreSQL)' },
          { value: 'pinecone', label: 'Pinecone' },
          { value: 'weaviate', label: 'Weaviate' },
          { value: 'qdrant', label: 'Qdrant' },
          { value: 'milvus', label: 'Milvus' },
          { value: 'chroma', label: 'Chroma (local/dev)' },
          { value: 'opensearch-knn', label: 'OpenSearch k-NN' },
        ]}
        onChange={update}
      />
      <TextField label="Index / collection name" configKey="index_ref"
        value={String(cfg.index_ref ?? '')} placeholder="e.g. rag_docs_prod"
        onChange={update}
      />
    </>
  )
}

function VectorRetrieverConfig({ cfg, update }: { cfg: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <SectionHeader title="Retrieval" />
      <NumberField label="Top K candidates" hint="Number of chunks to retrieve before reranking"
        configKey="top_k" value={Number(cfg.top_k ?? 20)}
        min={1} max={200} step={1} onChange={update}
      />
      <SelectField label="Similarity metric" hint="Distance function used for ANN search"
        configKey="similarity_metric" value={String(cfg.similarity_metric ?? 'cosine')}
        options={[
          { value: 'cosine', label: 'Cosine similarity' },
          { value: 'dot_product', label: 'Dot product (IP)' },
          { value: 'euclidean', label: 'Euclidean (L2)' },
        ]}
        onChange={update}
      />
      <SelectField label="ANN algorithm" hint="Approximate nearest-neighbour index algorithm"
        configKey="ann_algo" value={String(cfg.ann_algo ?? 'hnsw')}
        options={[
          { value: 'hnsw', label: 'HNSW (high recall, fast)' },
          { value: 'ivfflat', label: 'IVFFlat (balanced)' },
          { value: 'exact', label: 'Exact brute-force (small datasets)' },
          { value: 'lsh', label: 'LSH (very large scale)' },
        ]}
        onChange={update}
      />
      <SectionHeader title="Filtering & post-processing" />
      <ToggleField label="Enable metadata pre-filter" hint="Apply metadata WHERE clause before ANN search"
        configKey="enable_prefilter" value={Boolean(cfg.enable_prefilter ?? false)} onChange={update}
      />
      {Boolean(cfg.enable_prefilter) && (
        <TextField label="Pre-filter expression" hint="e.g. doc_type = 'policy' AND year >= 2023"
          configKey="prefilter_expr" value={String(cfg.prefilter_expr ?? '')}
          placeholder="field = 'value' AND ..."
          onChange={update}
        />
      )}
      <ToggleField label="Enable MMR diversity" hint="Maximal Marginal Relevance: balance relevance vs. diversity"
        configKey="enable_mmr" value={Boolean(cfg.enable_mmr ?? false)} onChange={update}
      />
      {Boolean(cfg.enable_mmr) && (
        <NumberField label="MMR lambda (diversity ↔ relevance)" hint="0 = max diversity, 1 = max relevance"
          configKey="mmr_lambda" value={Number(cfg.mmr_lambda ?? 0.5)}
          min={0} max={1} step={0.05} onChange={update}
        />
      )}
      <TextField label="Index / store ref" configKey="index_ref"
        value={String(cfg.index_ref ?? '')} placeholder="Integration or index id"
        onChange={update}
      />
    </>
  )
}

function LexicalRetrieverConfig({ cfg, update }: { cfg: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <SectionHeader title="Lexical algorithm" />
      <SelectField label="Ranking algorithm" hint="Sparse retrieval scoring function"
        configKey="lexical_algo" value={String(cfg.lexical_algo ?? 'bm25')}
        options={[
          { value: 'bm25', label: 'BM25 (Okapi BM25)' },
          { value: 'tfidf', label: 'TF-IDF' },
          { value: 'bm25_plus', label: 'BM25+ (lower TF saturation)' },
          { value: 'spl', label: 'SPL (two-stage proximity)' },
        ]}
        onChange={update}
      />
      <NumberField label="Top K" hint="Number of documents to retrieve"
        configKey="top_k" value={Number(cfg.top_k ?? 10)}
        min={1} max={200} step={1} onChange={update}
      />
      <SectionHeader title="BM25 tuning" />
      <NumberField label="k1 (term-frequency saturation)" hint="Typical range 1.2–2.0; higher = more TF influence"
        configKey="bm25_k1" value={Number(cfg.bm25_k1 ?? 1.5)}
        min={0.1} max={3} step={0.1} onChange={update}
      />
      <NumberField label="b (length normalization)" hint="0 = no normalization, 1 = full; typical 0.75"
        configKey="bm25_b" value={Number(cfg.bm25_b ?? 0.75)}
        min={0} max={1} step={0.05} onChange={update}
      />
      <SectionHeader title="Index" />
      <SelectField label="Index backend" configKey="lexical_index_backend"
        value={String(cfg.lexical_index_backend ?? 'elasticsearch')}
        options={[
          { value: 'elasticsearch', label: 'Elasticsearch / OpenSearch' },
          { value: 'typesense', label: 'Typesense' },
          { value: 'meilisearch', label: 'Meilisearch' },
          { value: 'whoosh', label: 'Whoosh (in-process, dev)' },
          { value: 'tantivy', label: 'Tantivy (Rust, fast)' },
        ]}
        onChange={update}
      />
      <TextField label="Index ref" configKey="index_ref"
        value={String(cfg.index_ref ?? '')} placeholder="Integration or index id"
        onChange={update}
      />
    </>
  )
}

function GraphRetrieverConfig({ cfg, update }: { cfg: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <SectionHeader title="Graph traversal" />
      <SelectField label="Traversal algorithm" hint="Strategy for walking the knowledge graph"
        configKey="traversal_algo" value={String(cfg.traversal_algo ?? 'bfs')}
        options={[
          { value: 'bfs', label: 'Breadth-first search (BFS)' },
          { value: 'dfs', label: 'Depth-first search (DFS)' },
          { value: 'pagerank', label: 'PersonalizedPageRank (PPR)' },
          { value: 'beam', label: 'Beam search (top-K paths)' },
          { value: 'bidirectional_bfs', label: 'Bidirectional BFS' },
        ]}
        onChange={update}
      />
      <NumberField label="Max hop depth" hint="Maximum edges to traverse from seed nodes"
        configKey="traversal_depth" value={Number(cfg.traversal_depth ?? 2)}
        min={1} max={8} step={1} onChange={update}
      />
      <NumberField label="Max nodes returned" hint="Cap on retrieved graph nodes before reranking"
        configKey="max_nodes" value={Number(cfg.max_nodes ?? 50)}
        min={5} max={500} step={5} onChange={update}
      />
      <SectionHeader title="Edge filtering" />
      <TextField label="Allowed edge types (comma-separated)" hint="e.g. RELATED_TO,PART_OF,CITES"
        configKey="allow_edge_types" value={String(cfg.allow_edge_types ?? '')}
        placeholder="Leave empty for all" onChange={update}
      />
      <TextField label="Blocked edge types" configKey="block_edge_types"
        value={String(cfg.block_edge_types ?? '')} placeholder="Leave empty for none"
        onChange={update}
      />
      <SectionHeader title="Graph database" />
      <SelectField label="Graph DB backend" configKey="graph_db"
        value={String(cfg.graph_db ?? 'neo4j')}
        options={[
          { value: 'neo4j', label: 'Neo4j (Bolt / Cypher)' },
          { value: 'amazon_neptune', label: 'Amazon Neptune (Gremlin)' },
          { value: 'tigergraph', label: 'TigerGraph (GSQL)' },
          { value: 'nebula', label: 'NebulaGraph (nGQL)' },
          { value: 'kuzu', label: 'Kùzu (embedded, dev)' },
        ]}
        onChange={update}
      />
      <TextField label="DB ref / URI key" configKey="db_ref"
        value={String(cfg.db_ref ?? '')} placeholder="e.g. graph:neo4j-prod"
        onChange={update}
      />
      <ToggleField label="Return subgraph context" hint="Include edge labels and node properties in retrieved context"
        configKey="return_subgraph" value={Boolean(cfg.return_subgraph ?? true)} onChange={update}
      />
    </>
  )
}

function TemporalFilterConfig({ cfg, update }: { cfg: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <SectionHeader title="As-of strategy" />
      <SelectField label="As-of date source" hint="How the effective-date for retrieval is determined"
        configKey="as_of_strategy" value={String(cfg.as_of_strategy ?? 'request_date')}
        options={[
          { value: 'request_date', label: 'Request date (today)' },
          { value: 'query_extracted', label: 'Extracted from query text' },
          { value: 'fixed', label: 'Fixed date (configured below)' },
          { value: 'session_param', label: 'Session parameter (API caller provides)' },
        ]}
        onChange={update}
      />
      {String(cfg.as_of_strategy) === 'fixed' && (
        <TextField label="Fixed as-of date" configKey="fixed_as_of_date"
          value={String(cfg.fixed_as_of_date ?? '')} placeholder="YYYY-MM-DD"
          onChange={update}
        />
      )}
      <SectionHeader title="Document date fields" />
      <TextField label="Effective-from field name" hint="The document metadata field holding the start date"
        configKey="effective_from_field" value={String(cfg.effective_from_field ?? 'effective_from')}
        placeholder="effective_from" onChange={update}
      />
      <TextField label="Effective-to field name" hint="The document metadata field holding the end/expiry date"
        configKey="effective_to_field" value={String(cfg.effective_to_field ?? 'effective_to')}
        placeholder="effective_to" onChange={update}
      />
      <SectionHeader title="Window" />
      <SelectField label="Lookback window" hint="How far back to retrieve if as-of has no exact match"
        configKey="time_window" value={String(cfg.time_window ?? '30d')}
        options={[
          { value: '7d', label: '7 days' },
          { value: '30d', label: '30 days' },
          { value: '90d', label: '90 days' },
          { value: '1y', label: '1 year' },
          { value: 'all', label: 'All time (no window)' },
        ]}
        onChange={update}
      />
      <ToggleField label="Strict point-in-time" hint="Reject documents whose effective-to is before the as-of date"
        configKey="strict_pit" value={Boolean(cfg.strict_pit ?? true)} onChange={update}
      />
    </>
  )
}

function RerankerConfig({ cfg, update }: { cfg: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <SectionHeader title="Reranker model" />
      <SelectField label="Reranker" hint="Model used to re-score and re-rank retrieved candidates"
        configKey="reranker_model" value={String(cfg.reranker_model ?? 'cohere-rerank-v3')}
        options={[
          { value: 'cohere-rerank-v3', label: 'Cohere rerank-english-v3.0' },
          { value: 'cohere-rerank-multilingual', label: 'Cohere rerank-multilingual-v3.0' },
          { value: 'cross-encoder-ms-marco', label: 'Cross-encoder MS MARCO (open)' },
          { value: 'cross-encoder-nli', label: 'Cross-encoder NLI (open)' },
          { value: 'bge-reranker-large', label: 'BGE-reranker-large (open)' },
          { value: 'custom', label: 'Custom cross-encoder endpoint' },
        ]}
        onChange={update}
      />
      {String(cfg.reranker_model) === 'custom' && (
        <TextField label="Custom reranker endpoint" configKey="custom_reranker_url"
          value={String(cfg.custom_reranker_url ?? '')} placeholder="https://..."
          onChange={update}
        />
      )}
      <NumberField label="Top K after rerank" hint="Number of final candidates passed downstream"
        configKey="top_k" value={Number(cfg.top_k ?? 5)}
        min={1} max={50} step={1} onChange={update}
      />
      <SectionHeader title="Options" />
      <ToggleField label="Use cross-encoder scores" hint="Score candidates jointly with query (slower, more accurate)"
        configKey="use_cross_encoder" value={Boolean(cfg.use_cross_encoder ?? true)} onChange={update}
      />
      <ToggleField label="Return relevance scores" hint="Pass reranker scores to downstream nodes"
        configKey="return_scores" value={Boolean(cfg.return_scores ?? false)} onChange={update}
      />
    </>
  )
}

function LLMConfig({ cfg, update }: { cfg: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <SectionHeader title="Model" />
      <SelectField label="LLM" hint="Language model used for answer generation"
        configKey="model_ref" value={String(cfg.model_ref ?? 'claude-3-5-sonnet')}
        options={[
          { value: 'claude-3-5-sonnet', label: 'Anthropic Claude 3.5 Sonnet' },
          { value: 'claude-3-opus', label: 'Anthropic Claude 3 Opus' },
          { value: 'gpt-4o', label: 'OpenAI GPT-4o' },
          { value: 'gpt-4-turbo', label: 'OpenAI GPT-4 Turbo' },
          { value: 'gemini-1.5-pro', label: 'Google Gemini 1.5 Pro' },
          { value: 'llama-3-70b', label: 'Meta Llama-3 70B (self-hosted)' },
          { value: 'mistral-large', label: 'Mistral Large' },
          { value: 'custom', label: 'Custom OpenAI-compatible endpoint' },
        ]}
        onChange={update}
      />
      {String(cfg.model_ref) === 'custom' && (
        <TextField label="Custom LLM endpoint" configKey="custom_llm_url"
          value={String(cfg.custom_llm_url ?? '')} placeholder="https://..."
          onChange={update}
        />
      )}
      <SectionHeader title="Generation parameters" />
      <NumberField label="Max output tokens" hint="Hard cap on generated tokens"
        configKey="max_tokens" value={Number(cfg.max_tokens ?? 1024)}
        min={64} max={16384} step={128} onChange={update}
      />
      <NumberField label="Temperature" hint="0 = deterministic, 1 = creative"
        configKey="temperature" value={Number(cfg.temperature ?? 0.2)}
        min={0} max={2} step={0.05} onChange={update}
      />
      <NumberField label="Top P (nucleus sampling)" hint="Probability mass to sample from; 1.0 = disabled"
        configKey="top_p" value={Number(cfg.top_p ?? 1.0)}
        min={0.1} max={1} step={0.05} onChange={update}
      />
      <SectionHeader title="Prompt" />
      <label className="wf-config-field">
        <FieldLabel label="System prompt" hint="Prepended to every context window as a system message" />
        <textarea
          rows={4}
          value={String(cfg.system_prompt ?? '')}
          placeholder="You are a precise enterprise knowledge assistant…"
          onChange={(e) => update('system_prompt', e.target.value)}
          className="wf-config-textarea"
        />
      </label>
      <ToggleField label="Stream response" hint="Enable streaming tokens to the UI"
        configKey="stream" value={Boolean(cfg.stream ?? false)} onChange={update}
      />
    </>
  )
}

function QueryClassifierConfig({ cfg, update }: { cfg: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <SectionHeader title="Classification" />
      <SelectField label="Classifier type" configKey="classifier_type"
        value={String(cfg.classifier_type ?? 'llm')}
        options={[
          { value: 'llm', label: 'LLM-based (prompt)' },
          { value: 'zero_shot', label: 'Zero-shot NLI classifier' },
          { value: 'fine_tuned', label: 'Fine-tuned FastText / BERT' },
          { value: 'rule', label: 'Rule-based (regex / keyword)' },
        ]}
        onChange={update}
      />
      <TextField label="Intent labels (comma-separated)" configKey="intent_labels"
        value={String(cfg.intent_labels ?? 'faq,how_to,entity_lookup,relationship,comparison')}
        placeholder="faq,how_to,entity_lookup,..." onChange={update}
      />
      <NumberField label="Min confidence threshold" hint="Below this score the query falls back to default route"
        configKey="min_confidence" value={Number(cfg.min_confidence ?? 0.6)}
        min={0} max={1} step={0.05} onChange={update}
      />
      <TextField label="Model ref" configKey="model_ref"
        value={String(cfg.model_ref ?? '')} placeholder="llm:intent-cls"
        onChange={update}
      />
    </>
  )
}

function MetadataFilterConfig({ cfg, update }: { cfg: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <SectionHeader title="Filter expression" />
      <label className="wf-config-field">
        <FieldLabel label="Filter DSL" hint="Metadata filter applied before retrieval; supports AND/OR/NOT, comparisons, IN" />
        <textarea
          rows={4}
          value={String(cfg.filter_expr ?? '')}
          placeholder={'doc_type IN [\'policy\',\'regulation\']\nAND jurisdiction = \'US\'\nAND year >= 2022'}
          onChange={(e) => update('filter_expr', e.target.value)}
          className="wf-config-textarea"
        />
      </label>
      <ToggleField label="Pass-through on empty" hint="Skip filter when expression is blank rather than returning empty"
        configKey="pass_through_empty" value={Boolean(cfg.pass_through_empty ?? true)} onChange={update}
      />
    </>
  )
}

function GuardrailConfig({ cfg, update }: { cfg: Record<string, unknown>; update: (k: string, v: unknown) => void }) {
  return (
    <>
      <SectionHeader title="Guardrail checks" />
      <ToggleField label="PII detection" configKey="check_pii" value={Boolean(cfg.check_pii ?? true)} onChange={update} />
      <ToggleField label="Toxicity / hate speech" configKey="check_toxicity" value={Boolean(cfg.check_toxicity ?? true)} onChange={update} />
      <ToggleField label="Prompt injection detection" configKey="check_injection" value={Boolean(cfg.check_injection ?? true)} onChange={update} />
      <ToggleField label="Hallucination grounding check" configKey="check_grounding" value={Boolean(cfg.check_grounding ?? false)} onChange={update} />
      <SelectField label="Action on violation" configKey="on_violation"
        value={String(cfg.on_violation ?? 'block')}
        options={[
          { value: 'block', label: 'Block — return error response' },
          { value: 'redact', label: 'Redact — strip offending content' },
          { value: 'warn', label: 'Warn — let through with flag' },
          { value: 'fallback', label: 'Fallback route — redirect query' },
        ]}
        onChange={update}
      />
    </>
  )
}

// ─── Main panel ──────────────────────────────────────────────────────────────

export function NodeConfigPanel({ node, onNodeUpdate }: NodeConfigPanelProps) {
  if (!node) {
    return (
      <aside className="wf-config-panel">
        <h2>Configuration</h2>
        <p>Select a node on the canvas to configure its behavior.</p>
      </aside>
    )
  }

  const type = (node.data?.type as NodeType) ?? 'input_query'
  const config = (node.data?.config as Record<string, unknown>) ?? {}
  const label = node.data?.label ?? NODE_LABELS[type] ?? type
  const nodeId = node.id  // captured so the closure below has a stable non-null reference

  function updateConfig(key: string, value: unknown) {
    onNodeUpdate(nodeId, { config: { ...config, [key]: value } })
  }

  return (
    <aside className="wf-config-panel">
      <h2>Node: {label}</h2>
      <p className="wf-config-type">{type}</p>
      <div className="wf-config-fields">
        {/* Label is always editable */}
        <label className="wf-config-field">
          <FieldLabel label="Display label" />
          <input
            type="text"
            value={(node.data?.label as string) ?? ''}
            onChange={(e) => onNodeUpdate(node.id, { label: e.target.value })}
            placeholder="Display name"
          />
        </label>

        {/* Deep per-type config */}
        {type === 'embedding_generator' && (
          <EmbeddingGeneratorConfig cfg={config} update={updateConfig} />
        )}
        {type === 'vector_retriever' && (
          <VectorRetrieverConfig cfg={config} update={updateConfig} />
        )}
        {type === 'lexical_retriever' && (
          <LexicalRetrieverConfig cfg={config} update={updateConfig} />
        )}
        {type === 'graph_retriever' && (
          <GraphRetrieverConfig cfg={config} update={updateConfig} />
        )}
        {type === 'temporal_filter' && (
          <TemporalFilterConfig cfg={config} update={updateConfig} />
        )}
        {type === 'reranker' && (
          <RerankerConfig cfg={config} update={updateConfig} />
        )}
        {(type === 'llm_answer_generator' || type === 'prompt_constructor') && (
          <LLMConfig cfg={config} update={updateConfig} />
        )}
        {(type === 'query_classifier' || type === 'intent_detector') && (
          <QueryClassifierConfig cfg={config} update={updateConfig} />
        )}
        {type === 'metadata_filter' && (
          <MetadataFilterConfig cfg={config} update={updateConfig} />
        )}
        {type === 'guardrail' && (
          <GuardrailConfig cfg={config} update={updateConfig} />
        )}
        {type === 'context_assembler' && (
          <>
            <SectionHeader title="Assembly" />
            <SelectField label="Merge strategy" configKey="merge_strategy"
              value={String(config.merge_strategy ?? 'concat')}
              options={[
                { value: 'concat', label: 'Concatenate (ordered)' },
                { value: 'weighted', label: 'Weighted score merge' },
                { value: 'reciprocal_rank', label: 'Reciprocal Rank Fusion (RRF)' },
                { value: 'deduplicate', label: 'Deduplicate + concat' },
              ]}
              onChange={updateConfig}
            />
            <NumberField label="Max context tokens" hint="Hard limit on assembled context passed to LLM"
              configKey="max_context_tokens" value={Number(config.max_context_tokens ?? 8192)}
              min={512} max={128000} step={512} onChange={updateConfig}
            />
          </>
        )}
      </div>
    </aside>
  )
}
