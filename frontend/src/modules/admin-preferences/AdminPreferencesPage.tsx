import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import { useAuth } from '../auth/AuthContext'

type UserPreference = {
  theme: string
  time_zone?: string | null
  density: string
  default_view_id?: number | null
}

async function fetchPreferences(userId: string) {
  const { data } = await apiClient.get<UserPreference>('/api/admin/preferences/me', {
    params: { user_id: userId },
  })
  return data
}

export function AdminPreferencesPage() {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-preferences', user?.id],
    queryFn: () => fetchPreferences(user!.id),
    enabled: !!user?.id,
  })

  return (
    <div>
      <h1>Preferences</h1>
      {isLoading && <p>Loading preferences…</p>}
      {!isLoading && data && (
        <ul>
          <li>
            <strong>Theme:</strong> {data.theme}
          </li>
          <li>
            <strong>Density:</strong> {data.density}
          </li>
          <li>
            <strong>Time zone:</strong> {data.time_zone ?? 'Not set'}
          </li>
          <li>
            <strong>Default view:</strong> {data.default_view_id ?? 'Not set'}
          </li>
        </ul>
      )}
    </div>
  )
}

