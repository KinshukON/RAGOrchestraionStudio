import { useEffect, useState } from 'react'
import './auth.css'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './AuthContext'
import { useToast } from '../ui/ToastContext'

export function LandingPage() {
  const { signInWithGoogle, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { success } = useToast()
  const [signingIn, setSigningIn] = useState(false)

  // Already authenticated → redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app', { replace: true })
    }
  }, [isAuthenticated, navigate])

  async function handleSignIn() {
    try {
      setSigningIn(true)
      await signInWithGoogle()
      // Clear any stale cached data so every query re-fetches with the new token
      qc.clear()
      const name = user?.name?.split(' ')[0] ?? 'there'
      success(`Welcome back, ${name}! 👋`)
      navigate('/app')
    } finally {
      setSigningIn(false)
    }
  }


  return (
    <div className="landing-root">
      <header className="landing-header">
        <div className="landing-logo">RAAGOS</div>
        <button className="landing-ghost-button" onClick={handleSignIn} disabled={signingIn}>
          {signingIn ? 'Signing in…' : 'Sign in with Google'}
        </button>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <h1>Enterprise Retrieval Architecture Studio</h1>
          <p>
            Design, configure, and operate governed RAG pipelines – vector, vectorless, graph, temporal, and
            hybrid – from a single control plane.
          </p>
          <button className="landing-primary-button" onClick={handleSignIn} disabled={signingIn}>
            {signingIn ? 'Signing in…' : 'Continue with Google'}
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

