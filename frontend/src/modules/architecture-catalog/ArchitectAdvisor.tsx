import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { createDesignSession, type ArchitectureType } from '../../api/architectures'
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
        'Your dataset is small enough to fit inside modern LLM context windows (Gemini 1.5 Pro, Claude 3.x, GPT-4o). Passing the entire corpus in the prompt gives full coverage with zero indexing overhead. Consider RAG only when context costs or latency become a concern.',
      emoji: '💡',
      color: 'advisor',
    }
  }

  // Fine-tuning — static, well-defined task, no citation requirement
  if (volume === 'small' && change === 'static' && citations === 'no') {
    return {
      archType: null,
      title: 'Fine-tuning',
      subtitle: 'Bake knowledge into the model weights',
      explanation:
        'Your data is static and compact — a fine-tuned model will likely outperform RAG here. Fine-tuning internalises domain knowledge into weights, giving faster and cheaper inference once trained. Use RAG when data changes frequently or source attribution is required.',
      emoji: '🎛️',
      color: 'advisor',
    }
  }

  // Graph RAG — explicit entity relationships or multi-hop needed
  if (structure === 'graph' || reasoning === 'yes') {
    return {
      archType: 'graph',
      title: 'Graph RAG',
      subtitle: 'Entity-aware multi-hop retrieval',
      explanation:
        'Your data has rich relationships between entities, or answering questions requires chaining multiple facts. Graph RAG traverses a knowledge graph (Neo4j, Neptune, etc.) alongside vector search to resolve entity paths — ideal for org hierarchies, supply chains, compliance networks, and biomedical knowledge.',
      emoji: '🕸️',
      color: 'graph',
    }
  }

  // Temporal RAG — time-stamped or real-time data
  if (structure === 'temporal' || change === 'realtime') {
    return {
      archType: 'temporal',
      title: 'Temporal RAG',
      subtitle: 'Time-aware retrieval over versioned records',
      explanation:
        'Your data is time-sensitive — contract versions, regulatory filings, news feeds, or live logs. Temporal RAG applies as-of-date filters at retrieval time so the LLM only sees data that was valid at a specific point in time, avoiding stale or future-dated leakage.',
      emoji: '⏱️',
      color: 'temporal',
    }
  }

  // Hybrid RAG — mixed data types
  if (structure === 'mixed') {
    return {
      archType: 'hybrid',
      title: 'Hybrid RAG',
      subtitle: 'Combine vector, lexical, and graph strategies',
      explanation:
        'Your corpus mixes document types, some structured and some unstructured. Hybrid RAG runs multiple retrieval strategies in parallel (dense vector, BM25 lexical, optional graph) and fuses results with RRF or weighted merging — great for enterprise search over heterogeneous data.',
      emoji: '🔀',
      color: 'hybrid',
    }
  }

  // Vectorless RAG — precision over recall, structured/tabular
  if (citations === 'yes' && volume === 'medium' && structure === 'docs') {
    return {
      archType: 'vectorless',
      title: 'Vectorless RAG',
      subtitle: 'Precision retrieval without embeddings',
      explanation:
        'Your data is well-structured and queries are precise enough that keyword/BM25 search outperforms fuzzy vector similarity. Vectorless RAG uses lexical retrieval (Elasticsearch, Typesense) for exact term matching with metadata filtering — lower latency and no embedding cost.',
      emoji: '🎯',
      color: 'vectorless',
    }
  }

  // Default — Vector RAG
  return {
    archType: 'vector',
    title: 'Vector RAG',
    subtitle: 'Semantic retrieval over embedded text',
    explanation:
      'The best general-purpose starting point. Your corpus is large enough to need retrieval, semantic similarity search across dense embeddings (pgvector, Pinecone, Qdrant) will find the right chunks, and you need source attribution. Vector RAG scales from thousands to billions of documents.',
    emoji: '⚡',
    color: 'vector',
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
            /* ── Result card ── */
            <div className={`arch-advisor-result arch-advisor-result--${result.color}`}>
              <div className="arch-advisor-result-emoji">{result.emoji}</div>
              <div className="arch-advisor-result-body">
                <div className="arch-advisor-result-subtitle">{result.subtitle}</div>
                <h3 className="arch-advisor-result-title">{result.title}</h3>
                <p className="arch-advisor-result-explanation">{result.explanation}</p>
                {/* ── Integration readiness + ops profile ── */}
                {result.archType && (
                  <RequiredIntegrationsPanel archType={result.archType} variant="result" />
                )}
              </div>
              <div className="arch-advisor-result-actions">
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
