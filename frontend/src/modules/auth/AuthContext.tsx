import { createContext, useContext, useMemo, useState } from 'react'

type User = {
  id: string
  name: string
  email: string
}

type AuthContextValue = {
  user: User | null
  isAuthenticated: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      // Placeholder: in a real implementation, integrate with Google Identity and backend session.
      async signInWithGoogle() {
        // TODO: replace stub with real Google authentication flow.
        setUser({
          id: 'demo-user',
          name: 'Demo User',
          email: 'demo@example.com',
        })
      },
      signOut() {
        setUser(null)
      },
    }),
    [user],
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

