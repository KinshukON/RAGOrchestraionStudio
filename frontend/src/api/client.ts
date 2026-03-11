import axios from 'axios'
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient()

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export const apiClient = axios.create({
  baseURL,
})

