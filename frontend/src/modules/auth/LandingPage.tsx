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
        <div className="landing-header-left">
          <img src="/ragos-icon.png" alt="RAGOS" className="landing-header-icon" />
          <span className="landing-header-wordmark">RAGOS</span>
        </div>
        <button className="landing-ghost-button" onClick={signInWithGoogle}>
          Sign in with Google
        </button>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-badge">Enterprise AI Infrastructure</div>
          <img src="/ragos-icon.png" alt="RAGOS" className="landing-hero-icon" />
          <h1 className="landing-hero-brand">RAGOS</h1>
          <h2 className="landing-hero-full-name">RAG Orchestration Studio</h2>
          <p className="landing-hero-tagline">
            Design, configure, and operate governed retrieval-augmented generation pipelines
            — vector, vectorless, graph, temporal, and hybrid — from a single enterprise control plane.
          </p>
          <button className="landing-primary-button" onClick={signInWithGoogle}>
            Continue with Google →
          </button>
        </section>

        <section className="landing-feature-grid">
          <article className="landing-card">
            <div className="landing-card-icon">🏗️</div>
            <h2>Architecture Catalog</h2>
            <p>18 RAG architecture patterns with commercial profiles, tier classification, and one-click design sessions.</p>
          </article>
          <article className="landing-card">
            <div className="landing-card-icon">🧠</div>
            <h2>Architect Advisor</h2>
            <p>8-question decision wizard that recommends the right architecture with cost, governance, and ROI analysis.</p>
          </article>
          <article className="landing-card">
            <div className="landing-card-icon">🔬</div>
            <h2>Query Lab</h2>
            <p>Compare 5 retrieval strategies side by side with latency, chunks, and citeable experiment IDs.</p>
          </article>
          <article className="landing-card">
            <div className="landing-card-icon">🔗</div>
            <h2>Integrations & Environments</h2>
            <p>Live connector health, stack validation, environment promotion pipeline with governance gates.</p>
          </article>
          <article className="landing-card">
            <div className="landing-card-icon">📊</div>
            <h2>Cost & ROI Analytics</h2>
            <p>3-layer cost economics, TCO comparator, use-case ROI templates, and environment cost heatmaps.</p>
          </article>
          <article className="landing-card">
            <div className="landing-card-icon">🛡️</div>
            <h2>Governance & Observability</h2>
            <p>RBAC-enforced publishing, audit trails, AI-driven recommendations, and prescriptive next actions.</p>
          </article>
        </section>

        <footer className="landing-footer">
          <p>Built for enterprise AI teams · Architecture · Governance · Observability · ROI</p>
        </footer>
      </main>
    </div>
  )
}
