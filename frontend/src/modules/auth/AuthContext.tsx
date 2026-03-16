import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { apiClient } from '../../api/client'

// ── Types ─────────────────────────────────────────────────────────────────────
type User = {
  id: string
  name: string
  email: string
  picture?: string | null
  permissions: string[]
}

type AuthState = {
  user: User | null
  accessToken: string | null
}

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  permissions: string[]
  signInWithGoogle: () => void          // now synchronous — just does a redirect
  exchangeCode: (code: string, redirectUri: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const AUTH_STORAGE_KEY = 'rag-studio-auth'
const REFRESH_TOKEN_KEY = 'rag-studio-refresh'

// ── Persistence helpers ───────────────────────────────────────────────────────
function saveAuth(state: AuthState, refreshToken: string) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  if (state.accessToken) localStorage.setItem('access_token', state.accessToken)
}

function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('auth_user')
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, accessToken: null })
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleRefresh = useCallback((expiresInSeconds: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const msUntilRefresh = Math.max((expiresInSeconds - 60) * 1000, 30_000)
    refreshTimerRef.current = setTimeout(async () => {
      const rt = localStorage.getItem(REFRESH_TOKEN_KEY)
      if (!rt) return
      try {
        const res = await apiClient.post<{ access_token: string; expires_in: number }>(
          '/api/auth/refresh',
          {},
          { headers: { Authorization: `Bearer ${rt}` } }
        )
        localStorage.setItem('access_token', res.data.access_token)
        setState(prev => ({ ...prev, accessToken: res.data.access_token }))
        scheduleRefresh(res.data.expires_in)
      } catch {
        clearAuth()
        setState({ user: null, accessToken: null })
      }
    }, msUntilRefresh)
  }, [])

  // Hydrate from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as AuthState
      if (parsed.user && parsed.accessToken) {
        setState(parsed)
        scheduleRefresh(3600)
      }
    } catch {
      clearAuth()
    }
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current) }
  }, [scheduleRefresh])

  // ── Step 1: redirect user to Google OAuth ─────────────────────────────────
  const signInWithGoogle = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
    if (!clientId) {
      console.error('VITE_GOOGLE_CLIENT_ID is not configured')
      return
    }
    const redirectUri = `${window.location.origin}/auth/callback`
    const state = crypto.randomUUID()
    sessionStorage.setItem('oauth_state', state)

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'select_account',
    })
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }, [])

  // ── Step 2: called from AuthCallbackPage after Google redirects back ───────
  const exchangeCode = useCallback(async (code: string, redirectUri: string) => {
    const res = await apiClient.post<{
      access_token: string
      refresh_token: string
      expires_in: number
      user: { id: string; name: string; email: string; picture?: string; permissions: string[] }
    }>('/api/auth/google-code', { code, redirect_uri: redirectUri })

    const { access_token, refresh_token, expires_in, user } = res.data
    const nextState: AuthState = { user, accessToken: access_token }
    setState(nextState)
    saveAuth(nextState, refresh_token)
    scheduleRefresh(expires_in)
  }, [scheduleRefresh])

  const signOut = useCallback(async () => {
    const rt = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (rt) {
      try {
        await apiClient.post('/api/auth/logout', {}, { headers: { Authorization: `Bearer ${rt}` } })
      } catch { /* best-effort */ }
    }
    clearAuth()
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    setState({ user: null, accessToken: null })
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user: state.user,
    isAuthenticated: !!state.user,
    permissions: state.user?.permissions ?? [],
    signInWithGoogle,
    exchangeCode,
    signOut,
  }), [state, signInWithGoogle, exchangeCode, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export function useHasPermission(permission: string): boolean {
  const { permissions } = useAuth()
  return permissions.includes(permission) || permissions.includes('super:admin')
}
