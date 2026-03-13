import type { FormEvent } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: fetchTeams,
  })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const createTeam = useMutation({
    mutationFn: () =>
      apiClient.post('/api/admin/teams', {
        name,
        description,
      }),
    onSuccess: () => {
      setName('')
      setDescription('')
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] })
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    createTeam.mutate()
  }

  return (
    <div>
      <h1>Teams</h1>
      <form onSubmit={handleSubmit} style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem' }}>
        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ display: 'block', marginTop: '0.25rem' }}
          />
        </label>
        <label style={{ flex: 1 }}>
          Description
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ display: 'block', marginTop: '0.25rem', width: '100%' }}
          />
        </label>
        <button type="submit" disabled={createTeam.isPending}>
          {createTeam.isPending ? 'Creating…' : 'Create team'}
        </button>
      </form>
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

