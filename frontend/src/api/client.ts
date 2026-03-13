import axios from 'axios'
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient()

// Empty string = same-origin (works on Vercel where /api/* is served from the same domain).
// Only falls back to localhost when explicitly running locally without VITE_API_BASE_URL set.
const baseURL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '')

export const apiClient = axios.create({ baseURL })

// ── Request interceptor – attach Bearer JWT if present ──────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers = config.headers ?? {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor – clear stale token on 401 ────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear auth state
      // The AuthContext will detect the missing token and show sign-in
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('auth_user')
    }
    return Promise.reject(error)
  }
)
