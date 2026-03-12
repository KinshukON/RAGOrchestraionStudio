import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'

type AdminView = {
  id: number
  key: string
  name: string
  description: string
}

async function fetchViews() {
  const { data } = await apiClient.get<AdminView[]>('/api/admin/views')
  return data
}

export function AdminViewsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-views'],
    queryFn: fetchViews,
  })

  return (
    <div>
      <h1>Views</h1>
      {isLoading && <p>Loading views…</p>}
      {!isLoading && (!data || data.length === 0) && <p>No views configured yet.</p>}
      {!isLoading && data && data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Name</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {data.map(view => (
              <tr key={view.id}>
                <td>{view.key}</td>
                <td>{view.name}</td>
                <td>{view.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

