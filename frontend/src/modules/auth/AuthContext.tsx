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
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const AUTH_STORAGE_KEY = 'rag-studio-auth'
const REFRESH_TOKEN_KEY = 'rag-studio-refresh'

// ── Google Identity Services types ────────────────────────────────────────────
type GoogleCredentialResponse = { credential: string }

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: { client_id: string; callback: (r: GoogleCredentialResponse) => void }): void
          prompt(): void
        }
      }
    }
  }
}

let googleScriptPromise: Promise<void> | null = null

function loadGoogleIdentityScript() {
  if (googleScriptPromise) return googleScriptPromise
  googleScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]')
    if (existing) {
      if (existing.dataset.loaded === 'true') { resolve(); return }
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.loaded = 'false'
    script.onload = () => { script.dataset.loaded = 'true'; resolve() }
    script.onerror = () => reject(new Error('Failed to load Google script'))
    document.head.appendChild(script)
  })
  return googleScriptPromise
}

// ── Persistence helpers ───────────────────────────────────────────────────────
function saveAuth(state: AuthState, refreshToken: string) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  // Also store access token separately so apiClient interceptor can read it
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
        scheduleRefresh(3600) // assume ~1h remaining; refresh fires at 59min
      }
    } catch {
      clearAuth()
    }
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current) }
  }, [scheduleRefresh])

  // ── Google sign-in: load GIS, prompt, exchange ID token with backend ─────────
  const signInWithGoogle = useCallback(async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
    if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not configured')

    await new Promise<void>((resolve, reject) => {
      let resolved = false

      loadGoogleIdentityScript()
        .then(() => {
          if (!window.google?.accounts.id) throw new Error('Google Identity Services failed to initialize')

          window.google.accounts.id.initialize({
            client_id: clientId,
            async callback(response: GoogleCredentialResponse) {
              try {
                const idToken = response.credential

                // Exchange with backend for our signed JWT
                const res = await apiClient.post<{
                  access_token: string
                  refresh_token: string
                  expires_in: number
                  user: { id: string; name: string; email: string; picture?: string; permissions: string[] }
                }>('/api/auth/google', { id_token: idToken })

                const { access_token, refresh_token, expires_in, user } = res.data
                const nextState: AuthState = { user, accessToken: access_token }

                setState(nextState)
                saveAuth(nextState, refresh_token)
                scheduleRefresh(expires_in)

                if (!resolved) { resolved = true; resolve() }
              } catch (error) {
                if (!resolved) { resolved = true; reject(error instanceof Error ? error : new Error(String(error))) }
              }
            },
          })

          try {
            window.google?.accounts.id.prompt()
          } catch (error) {
            if (!resolved) { resolved = true; reject(error instanceof Error ? error : new Error('Failed to start Google sign-in')) }
          }
        })
        .catch(err => {
          if (!resolved) { resolved = true; reject(err instanceof Error ? err : new Error('Failed to load Google script')) }
        })
    })
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
    signOut,
  }), [state, signInWithGoogle, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ── Hooks ─────────────────────────────────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

/**
 * Returns true if the current user has the given permission.
 * Also returns true if the user has super:admin.
 *
 * Usage: const canPublish = useHasPermission('workflow:publish')
 */
export function useHasPermission(permission: string): boolean {
  const { permissions } = useAuth()
  return permissions.includes(permission) || permissions.includes('super:admin')
}
