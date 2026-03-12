import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'

type AdminTeam = {
  id: number
  name: string
  description: string
  default_role_id?: number | null
}

async function fetchTeams() {
  const { data } = await apiClient.get<AdminTeam[]>('/api/admin/teams')
  return data
}

export function AdminTeamsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: fetchTeams,
  })

  return (
    <div>
      <h1>Teams</h1>
      {isLoading && <p>Loading teams…</p>}
      {!isLoading && (!data || data.length === 0) && <p>No teams defined yet.</p>}
      {!isLoading && data && data.length > 0 && (
        <ul>
          {data.map(team => (
            <li key={team.id}>
              <strong>{team.name}</strong> – {team.description}{' '}
              {team.default_role_id ? `(default role ${team.default_role_id})` : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

