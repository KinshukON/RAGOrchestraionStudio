import { Link } from 'react-router-dom'
import type { WorkflowMeta } from './modelMapping'
import './workflow-builder.css'

type ArchitectureSummaryPanelProps = {
  meta: WorkflowMeta
  designSessionId?: number | null
}

const ARCH_LABELS: Record<string, string> = {
  vector: 'Vector RAG',
  vectorless: 'Vectorless RAG',
  graph: 'Graph RAG',
  temporal: 'Temporal RAG',
  hybrid: 'Hybrid RAG',
  custom: 'Custom RAG',
  agentic: 'Agentic RAG',
  modular: 'Modular RAG',
  memory_augmented: 'Memory-Augmented RAG',
  multimodal: 'Multi-Modal RAG',
  federated: 'Federated RAG',
  streaming: 'Streaming RAG',
  contextual: 'Contextual RAG',
  knowledge_enhanced: 'Knowledge-Enhanced RAG',
  self_rag: 'Self-RAG',
  hyde: 'HyDE RAG',
  recursive: 'Recursive RAG',
  domain_specific: 'Domain-Specific RAG',
}

export function ArchitectureSummaryPanel({ meta, designSessionId }: ArchitectureSummaryPanelProps) {
  const label = ARCH_LABELS[meta.architecture_type] ?? meta.architecture_type

  return (
    <div className="wf-arch-summary">
      <div className="wf-arch-badge">{label}</div>
      <p className="wf-arch-name">{meta.name}</p>
      {meta.description && <p className="wf-arch-desc">{meta.description}</p>}
      {designSessionId != null && (
        <Link to={`/app/designer?sessionId=${designSessionId}`} className="wf-arch-link">
          Edit in Guided Designer
        </Link>
      )}
    </div>
  )
}
