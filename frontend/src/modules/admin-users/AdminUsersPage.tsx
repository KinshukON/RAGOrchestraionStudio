import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'

type AdminUser = {
  id: number
  name: string
  email: string
  role_id?: number | null
  team_id?: number | null
  is_active?: boolean
}

async function fetchUsers() {
  const { data } = await apiClient.get<AdminUser[]>('/api/admin/users')
  return data
}

export function AdminUsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchUsers,
  })

  return (
    <div>
      <h1>Users</h1>
      {isLoading && <p>Loading users…</p>}
      {!isLoading && (!data || data.length === 0) && <p>No users yet.</p>}
      {!isLoading && data && data.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Team</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map(user => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role_id ?? '-'}</td>
                <td>{user.team_id ?? '-'}</td>
                <td>{user.is_active === false ? 'Inactive' : 'Active'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

