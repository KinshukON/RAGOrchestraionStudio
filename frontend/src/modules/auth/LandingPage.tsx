import { useEffect } from 'react'
import './auth.css'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function LandingPage() {
  const { signInWithGoogle, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Already authenticated → redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app', { replace: true })
    }
  }, [isAuthenticated, navigate])

  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="landing-logo">RAGOS</div>
        <button className="landing-ghost-button" onClick={signInWithGoogle}>
          Sign in with Google
        </button>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <h1>Enterprise Retrieval Architecture Studio</h1>
          <p>
            Design, configure, and operate governed RAG pipelines – vector, vectorless, graph, temporal, and
            hybrid – from a single control plane.
          </p>
          <button className="landing-primary-button" onClick={signInWithGoogle}>
            Continue with Google →
          </button>
        </section>

        <section className="landing-feature-grid">
          <article className="landing-card">
            <h2>Visual Workflow Builder</h2>
            <p>Drag-and-drop retrieval, routing, and guardrail nodes to orchestrate complex RAG flows.</p>
          </article>
          <article className="landing-card">
            <h2>Query Studio</h2>
            <p>Test prompts and queries, trace retrieval paths, and compare strategies side by side.</p>
          </article>
          <article className="landing-card">
            <h2>Integrations Hub</h2>
            <p>Centralize model, database, and storage connections with environment-aware mappings.</p>
          </article>
        </section>
      </main>
    </div>
  )
}
