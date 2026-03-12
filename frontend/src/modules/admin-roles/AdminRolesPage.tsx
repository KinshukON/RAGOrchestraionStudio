import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'

type AdminRole = {
  id: number
  name: string
  description: string
}

async function fetchRoles() {
  const { data } = await apiClient.get<AdminRole[]>('/api/admin/roles')
  return data
}

export function AdminRolesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: fetchRoles,
  })

  return (
    <div>
      <h1>Roles</h1>
      {isLoading && <p>Loading roles…</p>}
      {!isLoading && (!data || data.length === 0) && <p>No roles defined yet.</p>}
      {!isLoading && data && data.length > 0 && (
        <ul>
          {data.map(role => (
            <li key={role.id}>
              <strong>{role.name}</strong> – {role.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

