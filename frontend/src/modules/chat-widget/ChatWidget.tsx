import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './chat-widget.css'

// ── Guided RAG advisor conversation flow ─────────────────────────────────────

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  options?: { label: string; value: string }[]
}

type AdvisorStep = {
  question: string
  options: { label: string; value: string; hint?: string }[]
}

const ADVISOR_STEPS: AdvisorStep[] = [
  {
    question: 'What kind of data will your RAG pipeline work with?',
    options: [
      { label: '📄 Unstructured text', value: 'text', hint: 'Docs, PDFs, articles' },
      { label: '🗂️ Structured data', value: 'structured', hint: 'Tables, SQL, CSV' },
      { label: '🕸️ Connected entities', value: 'graph', hint: 'Knowledge graphs, ontologies' },
      { label: '📊 Mix of everything', value: 'mixed', hint: 'Documents + tables + graphs' },
    ],
  },
  {
    question: 'How important is recency of information?',
    options: [
      { label: '⏰ Critical', value: 'critical', hint: 'Must have latest data' },
      { label: '📅 Somewhat important', value: 'moderate', hint: 'Recent preferred but not required' },
      { label: '📚 Not important', value: 'low', hint: 'Historical or evergreen content' },
    ],
  },
  {
    question: 'What\'s your priority — speed or accuracy?',
    options: [
      { label: '⚡ Speed first', value: 'speed', hint: 'Low latency, fast responses' },
      { label: '🎯 Accuracy first', value: 'accuracy', hint: 'Best possible answers' },
      { label: '⚖️ Balanced', value: 'balanced', hint: 'Good enough at both' },
    ],
  },
  {
    question: 'Do you need multi-hop reasoning across documents?',
    options: [
      { label: '🔗 Yes, frequently', value: 'yes', hint: 'Connect info across sources' },
      { label: '🔍 Sometimes', value: 'sometimes', hint: 'Occasionally useful' },
      { label: '📋 No, single-source is fine', value: 'no', hint: 'Direct retrieval' },
    ],
  },
]

type ArchResult = {
  name: string
  key: string
  emoji: string
  description: string
}

function recommendArchitecture(answers: string[]): ArchResult {
  const [data, recency, priority, multihop] = answers

  if (data === 'graph' || multihop === 'yes')
    return { name: 'Graph RAG', key: 'graph', emoji: '🕸️', description: 'Best for connected entities and multi-hop reasoning. Uses knowledge graph traversal with Cypher queries.' }
  if (recency === 'critical')
    return { name: 'Temporal RAG', key: 'temporal', emoji: '⏰', description: 'Prioritizes recent information using time-decay scoring and recency filters on vector search.' }
  if (data === 'structured' || priority === 'speed')
    return { name: 'Vectorless RAG', key: 'vectorless', emoji: '🔍', description: 'Fast lexical retrieval using BM25/full-text search. No embedding overhead, great for structured and keyword-rich content.' }
  if (data === 'mixed' || priority === 'accuracy' || multihop === 'sometimes')
    return { name: 'Hybrid RAG', key: 'hybrid', emoji: '🔀', description: 'Combines dense vectors + BM25 + cross-encoder reranking via RRF fusion. Best overall accuracy.' }

  return { name: 'Vector RAG', key: 'vector', emoji: '📐', description: 'Classic dense embedding similarity search. Great general-purpose architecture for unstructured text.' }
}

// ── Chat Widget Component ────────────────────────────────────────────────────

export function ChatWidget() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [advisorStep, setAdvisorStep] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [started, setStarted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = useCallback((role: 'user' | 'assistant', content: string, options?: ChatMessage['options']) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString() + Math.random(),
      role,
      content,
      options,
    }])
  }, [])

  function handleOpen() {
    setOpen(true)
    if (!started) {
      setStarted(true)
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '👋 Hi! I\'m the RAG Architect. I can help you choose the right retrieval architecture.\n\nWant me to guide you through a few quick questions?',
        options: [
          { label: '🚀 Start guided advisor', value: 'start_advisor' },
          { label: '💬 Chat freely', value: 'free_chat' },
        ],
      }])
    }
  }

  function handleOptionClick(value: string) {
    if (value === 'start_advisor') {
      addMessage('user', 'Start the guided advisor')
      setAdvisorStep(0)
      setAnswers([])
      setTimeout(() => {
        const step = ADVISOR_STEPS[0]
        addMessage('assistant', step.question, step.options.map(o => ({
          label: `${o.label}`,
          value: o.value,
        })))
      }, 300)
      return
    }

    if (value === 'free_chat') {
      addMessage('user', 'I\'ll chat freely')
      setTimeout(() => {
        addMessage('assistant', 'Sure! Ask me anything about RAG architectures, or type "help" for suggestions. You can also click the ↗ button to open the full Research Assistant.')
      }, 300)
      return
    }

    if (value === 'open_catalog') {
      navigate('/app/catalog')
      setOpen(false)
      return
    }

    if (value === 'restart') {
      setAdvisorStep(0)
      setAnswers([])
      addMessage('user', 'Restart advisor')
      setTimeout(() => {
        const step = ADVISOR_STEPS[0]
        addMessage('assistant', step.question, step.options.map(o => ({
          label: o.label,
          value: o.value,
        })))
      }, 300)
      return
    }

    // Advisor answer
    const currentStep = ADVISOR_STEPS[advisorStep]
    if (currentStep) {
      const selected = currentStep.options.find(o => o.value === value)
      addMessage('user', selected?.label ?? value)

      const newAnswers = [...answers, value]
      setAnswers(newAnswers)
      const nextStep = advisorStep + 1

      if (nextStep < ADVISOR_STEPS.length) {
        setAdvisorStep(nextStep)
        setTimeout(() => {
          const step = ADVISOR_STEPS[nextStep]
          addMessage('assistant', step.question, step.options.map(o => ({
            label: o.label,
            value: o.value,
          })))
        }, 400)
      } else {
        // Show recommendation
        setAdvisorStep(-1)
        setTimeout(() => {
          const result = recommendArchitecture(newAnswers)
          addMessage('assistant', `${result.emoji} **${result.name}**\n\n${result.description}`, [
            { label: '🏗️ Open Architecture Catalog', value: 'open_catalog' },
            { label: '🔄 Start over', value: 'restart' },
          ])
        }, 600)
      }
    }
  }

  function handleSend() {
    if (!input.trim()) return
    addMessage('user', input)
    const q = input.toLowerCase()
    setInput('')

    setTimeout(() => {
      if (/help|what can|command/i.test(q)) {
        addMessage('assistant', 'I can help with:\n\n• "Guide me" — start the RAG architecture advisor\n• "What is vector RAG?" — architecture explanations\n• "Compare hybrid vs graph" — comparisons\n• Click ↗ to open the full Research Assistant')
      } else if (/guide|advisor|start|begin/i.test(q)) {
        handleOptionClick('start_advisor')
      } else if (/vector.*rag|what.*vector/i.test(q)) {
        addMessage('assistant', '📐 **Vector RAG** uses dense embeddings (e.g., OpenAI text-embedding-3) to encode documents as vectors, then retrieves the most similar via ANN cosine search. Great for unstructured text, semantic understanding, and general-purpose Q&A.')
      } else if (/graph.*rag|what.*graph/i.test(q)) {
        addMessage('assistant', '🕸️ **Graph RAG** uses a knowledge graph (e.g., Neo4j) to traverse entity relationships via Cypher queries. Ideal for multi-hop reasoning, connected data, and complex relationship-based questions.')
      } else if (/hybrid/i.test(q)) {
        addMessage('assistant', '🔀 **Hybrid RAG** fuses dense vector search + BM25 lexical search using Reciprocal Rank Fusion (RRF), then applies cross-encoder reranking. Highest accuracy but higher latency.')
      } else if (/temporal/i.test(q)) {
        addMessage('assistant', '⏰ **Temporal RAG** applies time-decay scoring and recency filters to vector search results. Best when freshness matters — news, logs, recent events.')
      } else if (/vectorless|lexical|bm25/i.test(q)) {
        addMessage('assistant', '🔍 **Vectorless RAG** uses BM25 / full-text search without embeddings. Fast, predictable, great for structured/keyword-rich content. No embedding model needed.')
      } else if (/compare/i.test(q)) {
        addMessage('assistant', 'Quick comparison:\n\n• **Vector** — general purpose, semantic\n• **Vectorless** — fast, keyword-based\n• **Graph** — entity relationships, multi-hop\n• **Temporal** — recency-critical\n• **Hybrid** — best accuracy, all signals\n\nWant me to run the guided advisor? Type "guide me".')
      } else {
        addMessage('assistant', 'I\'m focused on RAG architecture guidance. Try:\n• "Guide me" for the advisor\n• "What is hybrid RAG?"\n• "Compare architectures"\n• Click ↗ for the full Research Assistant')
      }
    }, 400)
  }

  return (
    <>
      {/* Floating bubble */}
      <button
        className={`chat-fab ${open ? 'chat-fab--open' : ''}`}
        onClick={() => open ? setOpen(false) : handleOpen()}
        aria-label={open ? 'Close chat' : 'Open RAG Architect'}
      >
        {open ? '✕' : '💬'}
      </button>

      {/* Panel */}
      {open && (
        <div className="chat-panel" ref={panelRef}>
          {/* Header */}
          <header className="chat-panel-header">
            <div className="chat-panel-header-info">
              <span className="chat-panel-avatar">🏗️</span>
              <div>
                <strong className="chat-panel-name">RAG Architect</strong>
                <span className="chat-panel-status">Online</span>
              </div>
            </div>
            <div className="chat-panel-header-actions">
              <button
                className="chat-panel-maximize"
                onClick={() => { setOpen(false); navigate('/app/research-assistant') }}
                title="Open full Research Assistant"
                aria-label="Maximize"
              >
                ↗
              </button>
              <button
                className="chat-panel-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </header>

          {/* Messages */}
          <div className="chat-panel-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`chat-msg chat-msg--${msg.role}`}>
                <div className="chat-msg-bubble">
                  {msg.content.split('\n').map((line, i) => (
                    <span key={i}>
                      {line.replace(/\*\*(.*?)\*\*/g, '⟨$1⟩').split('⟨').map((seg, j) => {
                        if (seg.includes('⟩')) {
                          const [bold, rest] = seg.split('⟩')
                          return <span key={j}><strong>{bold}</strong>{rest}</span>
                        }
                        return <span key={j}>{seg}</span>
                      })}
                      {i < msg.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
                {msg.options && (
                  <div className="chat-msg-options">
                    {msg.options.map(opt => (
                      <button
                        key={opt.value}
                        className="chat-msg-option-btn"
                        onClick={() => handleOptionClick(opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form className="chat-panel-input" onSubmit={e => { e.preventDefault(); handleSend() }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about RAG architectures…"
              className="chat-panel-input-field"
            />
            <button type="submit" className="chat-panel-send" disabled={!input.trim()}>
              ↑
            </button>
          </form>
        </div>
      )}
    </>
  )
}
