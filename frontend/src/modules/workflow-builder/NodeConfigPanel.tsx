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

  function updateConfig(key: string, value: unknown) {
    onNodeUpdate(node.id, { config: { ...config, [key]: value } })
  }

  const hasTopK = ['vector_retriever', 'lexical_retriever'].includes(type)
  const hasModelRef = ['embedding_generator', 'llm_answer_generator'].includes(type)
  const hasIndexRef = ['vector_retriever', 'lexical_retriever'].includes(type)

  return (
    <aside className="wf-config-panel">
      <h2>Node: {label}</h2>
      <p className="wf-config-type">{type}</p>
      <div className="wf-config-fields">
        <label className="wf-config-field">
          <span>Label</span>
          <input
            type="text"
            value={(node.data?.label as string) ?? ''}
            onChange={(e) => onNodeUpdate(node.id, { label: e.target.value })}
            placeholder="Display name"
          />
        </label>
        {hasTopK && (
          <label className="wf-config-field">
            <span>Top K</span>
            <input
              type="number"
              min={1}
              value={Number((config.top_k as number) ?? 10)}
              onChange={(e) => updateConfig('top_k', Number(e.target.value) || 1)}
            />
          </label>
        )}
        {hasIndexRef && (
          <label className="wf-config-field">
            <span>Index / store ref</span>
            <input
              type="text"
              value={String(config.index_ref ?? '')}
              onChange={(e) => updateConfig('index_ref', e.target.value)}
              placeholder="Integration or index id"
            />
          </label>
        )}
        {hasModelRef && (
          <label className="wf-config-field">
            <span>Model ref</span>
            <input
              type="text"
              value={String(config.model_ref ?? '')}
              onChange={(e) => updateConfig('model_ref', e.target.value)}
              placeholder="LLM or embedding model id"
            />
          </label>
        )}
        {type === 'temporal_filter' && (
          <label className="wf-config-field">
            <span>Time window</span>
            <input
              type="text"
              value={String(config.time_window ?? '30d')}
              onChange={(e) => updateConfig('time_window', e.target.value)}
              placeholder="e.g. 7d, 30d"
            />
          </label>
        )}
        {type === 'graph_retriever' && (
          <label className="wf-config-field">
            <span>Traversal depth</span>
            <input
              type="number"
              min={1}
              value={Number((config.traversal_depth as number) ?? 2)}
              onChange={(e) => updateConfig('traversal_depth', Number(e.target.value) || 1)}
            />
          </label>
        )}
      </div>
    </aside>
  )
}
