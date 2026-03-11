import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { apiClient } from '../../api/client'

type User = {
  id: string
  name: string
  email: string
  picture?: string | null
}

type AuthState = {
  user: User | null
  accessToken: string | null
}

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const AUTH_STORAGE_KEY = 'rag-studio-auth'

type GoogleCredentialResponse = {
  credential: string
}

type AuthResponse = {
  access_token: string
  token_type: string
  expires_in: number
  user: User
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: {
            client_id: string
            callback: (response: GoogleCredentialResponse) => void
          }): void
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
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    )
    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolve()
        return
      }
      existingScript.addEventListener('load', () => resolve())
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google script')))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.loaded = 'false'
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error('Failed to load Google script'))
    document.head.appendChild(script)
  })

  return googleScriptPromise
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, accessToken: null })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!stored) return
    try {
      const parsed = JSON.parse(stored) as AuthState
      if (parsed.user && parsed.accessToken) {
        setState(parsed)
      }
    } catch {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: state.user,
      isAuthenticated: !!state.user,
      async signInWithGoogle() {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
        if (!clientId) {
          throw new Error('VITE_GOOGLE_CLIENT_ID is not configured')
        }

        await loadGoogleIdentityScript()

        if (!window.google?.accounts.id) {
          throw new Error('Google Identity Services failed to initialize')
        }

        await new Promise<void>((resolve, reject) => {
          let resolved = false

          window.google?.accounts.id.initialize({
            client_id: clientId,
            async callback(response: GoogleCredentialResponse) {
              try {
                const { data } = await apiClient.post<AuthResponse>('/api/auth/google', {
                  id_token: response.credential,
                })
                const nextState: AuthState = {
                  user: data.user,
                  accessToken: data.access_token,
                }
                setState(nextState)
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState))
                }
                if (!resolved) {
                  resolved = true
                  resolve()
                }
              } catch (error) {
                if (!resolved) {
                  resolved = true
                  reject(error instanceof Error ? error : new Error('Failed to sign in with Google'))
                }
              }
            },
          })

          try {
            window.google?.accounts.id.prompt()
          } catch (error) {
            if (!resolved) {
              resolved = true
              reject(error instanceof Error ? error : new Error('Failed to start Google sign-in'))
            }
          }
        })
      },
      signOut() {
        setState({ user: null, accessToken: null })
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(AUTH_STORAGE_KEY)
        }
      },
    }),
    [state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

