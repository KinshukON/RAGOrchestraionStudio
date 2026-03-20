import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from './AuthContext'
import { useToast } from '../ui/ToastContext'

/**
 * Handles the Google OAuth redirect callback.
 * Google redirects here with ?code=...&state=... after the user authenticates.
 * We verify state (CSRF), exchange the code for tokens via the backend, then
 * navigate to /app.
 */
export function AuthCallbackPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { exchangeCode } = useAuth()
  const { success } = useToast()
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    async function handle() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const returnedState = params.get('state')
      const errorParam = params.get('error')

      // Google returned an error (e.g. user denied)
      if (errorParam) {
        setErrMsg(`Google sign-in cancelled: ${errorParam}`)
        setStatus('error')
        return
      }

      if (!code) {
        setErrMsg('No authorization code received from Google.')
        setStatus('error')
        return
      }

      // Verify CSRF state
      const savedState = sessionStorage.getItem('oauth_state')
      sessionStorage.removeItem('oauth_state')
      if (savedState && returnedState !== savedState) {
        setErrMsg('OAuth state mismatch — possible CSRF attack. Please try signing in again.')
        setStatus('error')
        return
      }

      try {
        const redirectUri = `${window.location.origin}/auth/callback`
        await exchangeCode(code, redirectUri)
        qc.clear()
        success('Welcome back! 👋')
        navigate('/app', { replace: true })
      } catch (err: any) {
        const detail = err.response?.data?.detail;
        const msg = detail 
          ? (typeof detail === 'string' ? detail : JSON.stringify(detail))
          : (err instanceof Error ? err.message : String(err))
        setErrMsg(msg)
        setStatus('error')
      }
    }

    handle()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (status === 'error') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#0a0f1e', color: '#e2e8f0', fontFamily: 'Inter, sans-serif',
        gap: '1.5rem', padding: '2rem', textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.5rem' }}>⚠️</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: '#f87171' }}>
          Sign-in failed
        </h1>
        <p style={{ color: '#94a3b8', maxWidth: '420px', margin: 0 }}>{errMsg}</p>
        <button
          onClick={() => navigate('/', { replace: true })}
          style={{
            padding: '0.6rem 1.5rem', borderRadius: '0.5rem',
            background: '#818cf8', color: '#fff', border: 'none',
            fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem',
          }}
        >
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0a0f1e', color: '#e2e8f0', fontFamily: 'Inter, sans-serif',
      gap: '1rem',
    }}>
      <div style={{
        width: '2rem', height: '2rem', borderRadius: '50%',
        border: '3px solid #334155', borderTopColor: '#818cf8',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: '#94a3b8', margin: 0 }}>Completing sign in…</p>
    </div>
  )
}
