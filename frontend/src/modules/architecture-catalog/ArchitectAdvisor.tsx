import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { createDesignSession, type ArchitectureType } from '../../api/architectures'
import { ARCH_PROFILES } from './archProfiles'
import { RequiredIntegrationsPanel } from './RequiredIntegrationsPanel'
import './architect-advisor.css'

// ── Question definitions ────────────────────────────────────────────────
interface Option { id: string; label: string; hint?: string }
interface Question { id: string; text: string; options: Option[] }

const QUESTIONS: Question[] = [
  {
    id: 'volume',
    text: 'How large is the knowledge base you want to search over?',
    options: [
      { id: 'small',  label: 'Small — fits in one long prompt', hint: '< 200K tokens' },
      { id: 'medium', label: 'Medium — thousands of pages',     hint: '200K – 10M tokens' },
      { id: 'large',  label: 'Large — millions of documents',   hint: '> 10M tokens' },
    ],
  },
  {
    id: 'change',
    text: 'How often does your source data change?',
    options: [
      { id: 'static',   label: 'Rarely / never',        hint: 'Fixed dataset' },
      { id: 'periodic', label: 'Periodically',           hint: 'Weekly or monthly updates' },
      { id: 'realtime', label: 'Continuously / live',   hint: 'Daily or streaming changes' },
    ],
  },
  {
    id: 'citations',
    text: 'Do users need to see source citations or traceability?',
    options: [
      { id: 'yes',       label: 'Yes — always cite sources' },
      { id: 'sometimes', label: 'Nice to have' },
      { id: 'no',        label: 'No — just the answer' },
    ],
  },
  {
    id: 'structure',
    text: 'What best describes your data?',
    options: [
      { id: 'docs',    label: 'Plain documents / text',         hint: 'PDFs, articles, wikis' },
      { id: 'graph',   label: 'Rich entity relationships',      hint: 'Knowledge graphs, org data' },
      { id: 'temporal',label: 'Time-stamped / versioned records', hint: 'Logs, contracts, news feeds' },
      { id: 'mixed',   label: 'Mix of structured & unstructured' },
    ],
  },
  {
    id: 'reasoning',
    text: 'Does answering questions require chaining multiple facts together?',
    options: [
      { id: 'yes', label: 'Yes — multi-hop reasoning needed', hint: '"Who manages the team that owns product X?"' },
      { id: 'no',  label: 'No — single-step lookups are fine' },
    ],
  },
  {
    id: 'budget',
    text: 'What is your budget posture for retrieval infrastructure?',
    options: [
      { id: 'tight',    label: 'Tight — minimize cost per query',     hint: 'Cost is the primary constraint' },
      { id: 'moderate', label: 'Moderate — reasonable spend for quality', hint: 'Balance cost and capability' },
      { id: 'flexible', label: 'Flexible — invest for best results',    hint: 'Quality/accuracy over cost' },
    ],
  },
  {
    id: 'latency',
    text: 'What response latency is acceptable?',
    options: [
      { id: 'fast',     label: 'Under 500ms',       hint: 'Interactive / real-time' },
      { id: 'moderate', label: 'Under 2 seconds',    hint: 'Standard web experience' },
      { id: 'flexible', label: 'Flexible / batch OK', hint: 'Depth over speed' },
    ],
  },
  {
    id: 'explainability',
    text: 'Do you need to explain how answers were retrieved?',
    options: [
      { id: 'required',     label: 'Required — audit/compliance mandate',  hint: 'Regulated industry or policy' },
      { id: 'nice_to_have', label: 'Nice to have',                         hint: 'Helpful but not mandatory' },
      { id: 'not_needed',   label: 'Not needed',                           hint: 'End-user facing, no audit trail' },
    ],
  },
]

// ── Recommendation engine ───────────────────────────────────────────────
type Answers = Record<string, string>

interface Recommendation {
  archType: ArchitectureType | null   // null = not RAG
  title: string
  subtitle: string
  explanation: string
  emoji: string
  color: string
  // Infographic data
  pipeline?: { label: string; icon: string }[]
  useCases?: string[]
  strengths?: string[]
  tradeoffs?: string[]
  costContext?: string
  whyChosen?: string
  // Sprint 6: Commercial decision layer
  whyNotOthers?: { arch: string; reason: string }[]
  commercialProfile?: {
    setupEffort: string
    costPosture: string
    governancePosture: string
    likelyRoiLever: string
  }
}

function buildWhyNotOthers(chosen: string, answers: Answers): { arch: string; reason: string }[] {
  const others: { arch: string; reason: string }[] = []
  const { budget, latency, explainability: _explainability } = answers

  if (chosen !== 'vector' && chosen !== null)
    others.push({ arch: 'Vector RAG', reason: budget === 'tight' ? 'Embedding pipeline cost exceeds tight budget' : 'Data structure or reasoning needs go beyond flat semantic search' })
  if (chosen !== 'vectorless')
    others.push({ arch: 'Vectorless RAG', reason: 'Misses semantic meaning — only matches exact keywords, brittle on paraphrased queries' })
  if (chosen !== 'graph')
    others.push({ arch: 'Graph RAG', reason: latency === 'fast' ? 'Graph traversal adds latency — hard to hit <500ms' : 'No entity relationship structure in the data to exploit' })
  if (chosen !== 'temporal')
    others.push({ arch: 'Temporal RAG', reason: 'Data has no meaningful time dimension — temporal filtering adds overhead without benefit' })
  if (chosen !== 'hybrid')
    others.push({ arch: 'Hybrid RAG', reason: budget === 'tight' ? 'Multiple backends increase infrastructure cost beyond budget' : 'Simpler single-strategy retrieval covers this use case' })

  return others.slice(0, 4) // Cap at 4 alternatives
}

function buildCommercialProfile(archType: string | null, _answers: Answers): Recommendation['commercialProfile'] {
  if (!archType) return undefined
  const profile = ARCH_PROFILES[archType]
  if (!profile) return undefined

  const roiLevers: Record<string, string> = {
    vector: 'Support deflection and analyst time savings',
    vectorless: 'Compliance review time reduction and audit cost avoidance',
    graph: 'Investigation cycle time reduction and escalation avoidance',
    temporal: 'Audit review acceleration and regulatory compliance',
    hybrid: 'Cross-workload consolidation and infrastructure efficiency',
    agentic: 'Autonomous task completion replacing manual research workflows',
    custom: 'Custom pipeline optimization for unique business processes',
  }

  return {
    setupEffort: `~${profile.estimatedSetupDays} days`,
    costPosture: `${profile.costTier} cost tier — ${profile.costTier === 'Low' ? 'no embedding cost' : profile.costTier === 'Medium' ? 'standard embedding + LLM' : 'multi-backend infrastructure'}`,
    governancePosture: profile.governancePosture,
    likelyRoiLever: roiLevers[archType] ?? 'Operational efficiency through optimized retrieval',
  }
}

function recommend(answers: Answers): Recommendation {
  const { volume, change, citations, structure, reasoning } = answers

  // Long Context Window — data is small enough to just stuff into context
  if (volume === 'small' && citations === 'no' && change === 'static') {
    return {
      archType: null,
      title: 'Long Context Window',
      subtitle: 'You may not need RAG at all',
      explanation:
        'Your dataset is small enough to fit inside modern LLM context windows (Gemini 1.5 Pro, Claude 3.x, GPT-4o). Passing the entire corpus in the prompt gives full coverage with zero indexing overhead.',
      emoji: '💡',
      color: 'advisor',
      pipeline: [
        { label: 'Full Corpus', icon: '📄' },
        { label: 'Prompt', icon: '📝' },
        { label: 'LLM', icon: '🧠' },
        { label: 'Output', icon: '✅' },
      ],
      useCases: ['Small knowledge bases', 'Static FAQ', 'Single-document Q&A', 'Prototyping'],
      strengths: ['Zero infrastructure', 'No embedding cost', 'Simple implementation', 'Full corpus coverage'],
      tradeoffs: ['Cost scales with corpus size', 'Limited to context window', 'No source attribution', 'Latency increases with size'],
      costContext: '~$0.01–0.10/query · No indexing cost · Scales poorly past 200K tokens',
      whyChosen: 'Small dataset + no citation requirement + static data = context stuffing is simpler and cheaper than RAG.',
      whyNotOthers: [{ arch: 'Any RAG architecture', reason: 'Dataset fits in a single LLM context window — RAG adds unnecessary complexity' }],
    }
  }

  // Fine-tuning — static, well-defined task, no citation requirement
  if (volume === 'small' && change === 'static' && citations === 'no') {
    return {
      archType: null,
      title: 'Fine-tuning',
      subtitle: 'Bake knowledge into the model weights',
      explanation:
        'Your data is static and compact — a fine-tuned model will likely outperform RAG here. Fine-tuning internalises domain knowledge into weights, giving faster and cheaper inference once trained.',
      emoji: '🎛️',
      color: 'advisor',
      pipeline: [
        { label: 'Training Data', icon: '📊' },
        { label: 'Fine-tune', icon: '⚙️' },
        { label: 'Custom Model', icon: '🧠' },
        { label: 'Output', icon: '✅' },
      ],
      useCases: ['Domain-specific language', 'Fixed task patterns', 'Internal jargon/terminology', 'Classification tasks'],
      strengths: ['Fast inference', 'No retrieval latency', 'Embedded domain knowledge', 'Lower per-query cost'],
      tradeoffs: ['Expensive to retrain', 'Knowledge goes stale', 'No source attribution', 'Needs training infrastructure'],
      costContext: '$50–500 to fine-tune · ~$0.001/query after · Can\'t update without retraining',
      whyChosen: 'Small + static dataset + no citation requirement → knowledge fits best in model weights.',
      whyNotOthers: [{ arch: 'Any RAG architecture', reason: 'Static, compact data is better encoded in model weights than indexed for retrieval' }],
    }
  }

  // Graph RAG — explicit entity relationships or multi-hop needed
  if (structure === 'graph' || reasoning === 'yes') {
    return {
      archType: 'graph',
      title: 'Graph RAG',
      subtitle: 'Entity-aware multi-hop retrieval',
      explanation:
        'Your data has rich relationships between entities, or answering questions requires chaining multiple facts. Graph RAG traverses a knowledge graph alongside vector search to resolve entity paths.',
      emoji: '🕸️',
      color: 'graph',
      pipeline: [
        { label: 'User Query', icon: '👤' },
        { label: 'Entity Extract', icon: '🏷️' },
        { label: 'Graph Traversal', icon: '🕸️' },
        { label: 'Context Assembly', icon: '📋' },
        { label: 'LLM', icon: '🧠' },
        { label: 'Output', icon: '✅' },
      ],
      useCases: ['Org hierarchies', 'Supply chain analysis', 'Compliance networks', 'Biomedical knowledge', 'Legal case law'],
      strengths: ['Multi-hop reasoning', 'Relationship-aware', 'Structured + unstructured', 'Explainable paths', 'High accuracy on entity queries'],
      tradeoffs: ['Complex setup (Neo4j/Neptune)', 'Graph construction overhead', 'Higher latency', 'Needs entity extraction pipeline'],
      costContext: '~$0.01–0.05/query · Neo4j cloud from $65/mo · Higher setup but precise answers',
      whyChosen: 'Rich entity relationships or multi-hop reasoning needs → graph traversal outperforms flat vector search.',
      whyNotOthers: buildWhyNotOthers('graph', answers),
      commercialProfile: buildCommercialProfile('graph', answers),
    }
  }

  // Temporal RAG — time-stamped or real-time data
  if (structure === 'temporal' || change === 'realtime') {
    return {
      archType: 'temporal',
      title: 'Temporal RAG',
      subtitle: 'Time-aware retrieval over versioned records',
      explanation:
        'Your data is time-sensitive — contract versions, regulatory filings, news feeds, or live logs. Temporal RAG applies as-of-date filters so the LLM only sees temporally valid data.',
      emoji: '⏱️',
      color: 'temporal',
      pipeline: [
        { label: 'User Query', icon: '👤' },
        { label: 'Embedding', icon: '📐' },
        { label: 'Time Filter', icon: '⏰' },
        { label: 'Vector DB', icon: '🗄️' },
        { label: 'Recency Score', icon: '📅' },
        { label: 'LLM', icon: '🧠' },
        { label: 'Output', icon: '✅' },
      ],
      useCases: ['News & media feeds', 'Contract versioning', 'Regulatory filings', 'System logs', 'Event-driven data'],
      strengths: ['Recency-aware', 'Avoids stale data', 'Point-in-time queries', 'Freshness scoring'],
      tradeoffs: ['Needs timestamp metadata', 'More complex indexing', 'Decay functions need tuning', 'Older data may be lost'],
      costContext: '~$0.005–0.02/query · Same as vector + timestamp index · Streaming ingestor needed for real-time',
      whyChosen: 'Time-sensitive data or continuous updates → temporal filtering prevents stale/future-dated answers.',
      whyNotOthers: buildWhyNotOthers('temporal', answers),
      commercialProfile: buildCommercialProfile('temporal', answers),
    }
  }

  // Hybrid RAG — mixed data types
  if (structure === 'mixed') {
    return {
      archType: 'hybrid',
      title: 'Hybrid RAG',
      subtitle: 'Combine vector, lexical, and graph strategies',
      explanation:
        'Your corpus mixes document types. Hybrid RAG runs multiple retrieval strategies in parallel and fuses results with RRF or weighted merging — great for enterprise search over heterogeneous data.',
      emoji: '🔀',
      color: 'hybrid',
      pipeline: [
        { label: 'User Query', icon: '👤' },
        { label: 'Embedding', icon: '📐' },
        { label: 'Vector Search', icon: '🗄️' },
        { label: 'BM25 Search', icon: '🔍' },
        { label: 'RRF Fusion', icon: '🔀' },
        { label: 'Reranker', icon: '📊' },
        { label: 'LLM', icon: '🧠' },
        { label: 'Output', icon: '✅' },
      ],
      useCases: ['Enterprise search', 'Mixed doc types', 'High-accuracy Q&A', 'Legal/medical research', 'Competitive intelligence'],
      strengths: ['Best overall accuracy', 'Multiple signal fusion', 'Handles diverse data', 'Cross-encoder reranking', 'Flexible architecture'],
      tradeoffs: ['Higher complexity', 'Multiple indexes needed', '~2x latency vs single-strategy', 'More infrastructure cost'],
      costContext: '~$0.01–0.05/query · 2-3 retrieval backends · ~100x cheaper than full LLM context at scale',
      whyChosen: 'Mixed data types → no single retrieval strategy covers all formats; fusing multiple signals gives best accuracy.',
      whyNotOthers: buildWhyNotOthers('hybrid', answers),
      commercialProfile: buildCommercialProfile('hybrid', answers),
    }
  }

  // Vectorless RAG — precision over recall, structured/tabular
  if (citations === 'yes' && volume === 'medium' && structure === 'docs') {
    return {
      archType: 'vectorless',
      title: 'Vectorless RAG',
      subtitle: 'Precision retrieval without embeddings',
      explanation:
        'Your data is well-structured and queries are precise enough that keyword/BM25 search outperforms fuzzy vector similarity. Lower latency and no embedding cost.',
      emoji: '🎯',
      color: 'vectorless',
      pipeline: [
        { label: 'User Query', icon: '👤' },
        { label: 'BM25 Search', icon: '🔍' },
        { label: 'Metadata Filter', icon: '🏷️' },
        { label: 'Top-K Docs', icon: '📄' },
        { label: 'LLM', icon: '🧠' },
        { label: 'Output', icon: '✅' },
      ],
      useCases: ['Keyword-rich content', 'Technical documentation', 'Structured databases', 'API reference', 'Product catalogs'],
      strengths: ['No embedding cost', 'Fast retrieval', 'Exact term matching', 'Predictable results', 'Simple infrastructure'],
      tradeoffs: ['Misses synonyms', 'No semantic understanding', 'Brittle to paraphrasing', 'Lower recall on ambiguous queries'],
      costContext: '~$0.001/query · No embedding model needed · Elasticsearch/Typesense only',
      whyChosen: 'Structured data + citation need + medium corpus → lexical BM25 gives precise, attributable results without embedding overhead.',
      whyNotOthers: buildWhyNotOthers('vectorless', answers),
      commercialProfile: buildCommercialProfile('vectorless', answers),
    }
  }

  // Default — Vector RAG
  return {
    archType: 'vector',
    title: 'Vector RAG',
    subtitle: 'Semantic retrieval over embedded text',
    explanation:
      'The best general-purpose starting point. Dense embeddings find semantically similar chunks across large corpora. Scales from thousands to billions of documents with source attribution.',
    emoji: '⚡',
    color: 'vector',
    pipeline: [
      { label: 'Documents', icon: '📄' },
      { label: 'Chunking', icon: '✂️' },
      { label: 'Embedding', icon: '📐' },
      { label: 'Vector DB', icon: '🗄️' },
      { label: 'User Query', icon: '👤' },
      { label: 'Semantic Search', icon: '🔎' },
      { label: 'Top-K Docs', icon: '📋' },
      { label: 'Reranking', icon: '📊' },
      { label: 'LLM', icon: '🧠' },
      { label: 'Output', icon: '✅' },
    ],
    useCases: ['Customer support', 'Internal knowledge bases', 'Compliance & legal', 'Enterprise document search', 'Research Q&A'],
    strengths: ['Semantic understanding', 'Handles synonyms', 'Scales to billions', 'Source attribution', 'Broad ecosystem'],
    tradeoffs: ['Embedding cost', 'Index maintenance', 'Chunking strategy matters', 'Approximation (ANN) tradeoffs'],
    costContext: '~$0.001/query (RAG) vs $0.10 (full context) · ~100x cheaper at scale · Embedding once, retrieving many',
    whyChosen: 'Large unstructured corpus + need for semantic similarity + source citations → classic Vector RAG is the proven starting point.',
    whyNotOthers: buildWhyNotOthers('vector', answers),
    commercialProfile: buildCommercialProfile('vector', answers),
  }
}

// ── Component ───────────────────────────────────────────────────────────
interface Props {
  onBrowse: () => void   // scroll caller down to catalog tiles
}

export function ArchitectAdvisor({ onBrowse }: Props) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [result, setResult] = useState<Recommendation | null>(null)

  const designMutation = useMutation({
    mutationFn: createDesignSession,
    onSuccess: session => navigate(`/app/designer?sessionId=${session.id}`),
  })

  function selectOption(questionId: string, optionId: string) {
    const next = { ...answers, [questionId]: optionId }
    setAnswers(next)

    if (step < QUESTIONS.length - 1) {
      setStep(s => s + 1)
    } else {
      // All answered — compute recommendation
      setResult(recommend(next))
    }
  }

  function reset() {
    setStep(0)
    setAnswers({})
    setResult(null)
  }

  function handleOpen() {
    reset()
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
  }

  const currentQ = QUESTIONS[step]
  const progress = ((step) / QUESTIONS.length) * 100

  return (
    <div className="arch-advisor-root">
      {/* ── Two-path banner ── */}
      <div className="arch-advisor-banner">
        <div className="arch-advisor-banner-left">
          <div className="arch-advisor-banner-eyebrow">Where would you like to start?</div>
          <h2 className="arch-advisor-banner-title">
            Already know your architecture?
          </h2>
          <p className="arch-advisor-banner-sub">
            Browse the catalog below and click <strong>Design this architecture</strong> to jump straight in.
          </p>
          <button className="arch-advisor-btn arch-advisor-btn--ghost" onClick={onBrowse}>
            Browse catalog ↓
          </button>
        </div>

        <div className="arch-advisor-divider" />

        <div className="arch-advisor-banner-right">
          <div className="arch-advisor-banner-eyebrow">Not sure yet?</div>
          <h2 className="arch-advisor-banner-title">
            Help me choose
          </h2>
          <p className="arch-advisor-banner-sub">
            Answer 5 quick questions and we'll recommend whether RAG is even the right fit — and if so, which architecture.
          </p>
          <button
            className="arch-advisor-btn arch-advisor-btn--primary"
            onClick={handleOpen}
          >
            Start the advisor →
          </button>
        </div>
      </div>

      {/* ── Inline wizard panel ── */}
      {open && (
        <div className="arch-advisor-panel">
          {/* Close button */}
          <button
            className="arch-advisor-close-btn"
            onClick={handleClose}
            aria-label="Close advisor"
            title="Close advisor"
          >
            ✕
          </button>
          {!result ? (
            <>
              {/* Progress bar */}
              <div className="arch-advisor-progress-bar">
                <div
                  className="arch-advisor-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="arch-advisor-step-label">
                Question {step + 1} of {QUESTIONS.length}
              </div>

              {/* Question */}
              <h3 className="arch-advisor-question">{currentQ.text}</h3>

              {/* Options */}
              <div className="arch-advisor-options">
                {currentQ.options.map(opt => (
                  <button
                    key={opt.id}
                    className="arch-advisor-option"
                    onClick={() => selectOption(currentQ.id, opt.id)}
                  >
                    <span className="arch-advisor-option-label">{opt.label}</span>
                    {opt.hint && (
                      <span className="arch-advisor-option-hint">{opt.hint}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Back button */}
              {step > 0 && (
                <button
                  className="arch-advisor-back"
                  onClick={() => setStep(s => s - 1)}
                >
                  ← Back
                </button>
              )}
            </>
          ) : (
            /* ── Rich infographic result ── */
            <div className="advisor-infographic">
              {/* Hero section */}
              <div className={`advisor-info-hero advisor-info-hero--${result.color}`}>
                <span className="advisor-info-hero-emoji">{result.emoji}</span>
                <div>
                  <div className="advisor-info-hero-subtitle">{result.subtitle}</div>
                  <h2 className="advisor-info-hero-title">{result.title}</h2>
                </div>
              </div>

              <p className="advisor-info-explanation">{result.explanation}</p>

              {/* Why this was chosen */}
              {result.whyChosen && (
                <div className="advisor-info-why">
                  <div className="advisor-info-section-icon">🎯</div>
                  <div>
                    <div className="advisor-info-why-label">Why This Was Chosen</div>
                    <p className="advisor-info-why-text">{result.whyChosen}</p>
                  </div>
                </div>
              )}

              {/* Pipeline flow */}
              {result.pipeline && (
                <div className="advisor-info-section">
                  <h4 className="advisor-info-section-title">The Retrieval Pipeline</h4>
                  <div className="advisor-info-pipeline">
                    {result.pipeline.map((step, i) => (
                      <div key={i} className="advisor-info-pipeline-step">
                        <div className="advisor-info-pipeline-icon">{step.icon}</div>
                        <div className="advisor-info-pipeline-label">{step.label}</div>
                        {i < (result.pipeline?.length ?? 0) - 1 && (
                          <div className="advisor-info-pipeline-arrow">→</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths vs Tradeoffs */}
              {(result.strengths || result.tradeoffs) && (
                <div className="advisor-info-comparison">
                  {result.strengths && (
                    <div className="advisor-info-col">
                      <h4 className="advisor-info-col-title advisor-info-col-title--green">✅ Strengths</h4>
                      <ul className="advisor-info-list">
                        {result.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {result.tradeoffs && (
                    <div className="advisor-info-col">
                      <h4 className="advisor-info-col-title advisor-info-col-title--amber">⚠️ Tradeoffs</h4>
                      <ul className="advisor-info-list">
                        {result.tradeoffs.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Use cases */}
              {result.useCases && (
                <div className="advisor-info-section">
                  <h4 className="advisor-info-section-title">Where It's Used</h4>
                  <div className="advisor-info-usecases">
                    {result.useCases.map((uc, i) => (
                      <span key={i} className="advisor-info-usecase-tag">{uc}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cost context */}
              {result.costContext && (
                <div className="advisor-info-cost">
                  <span className="advisor-info-cost-icon">💰</span>
                  <span className="advisor-info-cost-text">{result.costContext}</span>
                </div>
              )}

              {/* Sprint 6: Commercial Profile */}
              {result.commercialProfile && (
                <div className="advisor-info-section">
                  <h4 className="advisor-info-section-title">Commercial Profile</h4>
                  <div className="advisor-commercial-grid">
                    <div className="advisor-commercial-cell">
                      <div className="advisor-commercial-cell-label">⏱ Setup Effort</div>
                      <div className="advisor-commercial-cell-value">{result.commercialProfile.setupEffort}</div>
                    </div>
                    <div className="advisor-commercial-cell">
                      <div className="advisor-commercial-cell-label">💰 Cost Posture</div>
                      <div className="advisor-commercial-cell-value">{result.commercialProfile.costPosture}</div>
                    </div>
                    <div className="advisor-commercial-cell">
                      <div className="advisor-commercial-cell-label">🏛️ Governance</div>
                      <div className="advisor-commercial-cell-value">{result.commercialProfile.governancePosture}</div>
                    </div>
                    <div className="advisor-commercial-cell">
                      <div className="advisor-commercial-cell-label">📈 Likely ROI Lever</div>
                      <div className="advisor-commercial-cell-value">{result.commercialProfile.likelyRoiLever}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sprint 6: Why Not Others */}
              {result.whyNotOthers && result.whyNotOthers.length > 0 && (
                <div className="advisor-info-section">
                  <h4 className="advisor-info-section-title">Why Not the Alternatives?</h4>
                  <div className="advisor-why-not-list">
                    {result.whyNotOthers.map((item, i) => (
                      <div key={i} className="advisor-why-not-item">
                        <span className="advisor-why-not-arch">✗ {item.arch}</span>
                        <span className="advisor-why-not-reason">{item.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Integration readiness */}
              {result.archType && (
                <RequiredIntegrationsPanel archType={result.archType} variant="result" />
              )}

              {/* Actions */}
              <div className="advisor-info-actions">
                {result.archType ? (
                  <button
                    className="arch-advisor-btn arch-advisor-btn--primary"
                    disabled={designMutation.isPending}
                    onClick={() =>
                      designMutation.mutate({ architecture_type: result.archType! })
                    }
                  >
                    {designMutation.isPending
                      ? 'Starting designer…'
                      : `Design ${result.title} →`}
                  </button>
                ) : (
                  <div className="arch-advisor-result-no-rag">
                    <span>No RAG workflow needed for this recommendation.</span>
                  </div>
                )}
                <button className="arch-advisor-btn arch-advisor-btn--ghost" onClick={onBrowse}>
                  Browse all architectures
                </button>
                <button className="arch-advisor-back" onClick={reset}>
                  ← Retake the quiz
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
