import type { FormEvent } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import { useToast } from '../ui/ToastContext'
import '../admin-users/admin.css'

type AdminTeam = {
  id: number
  name: string
  description: string
  default_role_id?: number | null
}

type AdminRole = { id: number; name: string }
type AdminUser = { id: number; team_id: number | null }

async function fetchTeams() {
  const { data } = await apiClient.get<AdminTeam[]>('/api/admin/teams')
  return data
}
async function fetchRoles() {
  const { data } = await apiClient.get<AdminRole[]>('/api/admin/roles')
  return data
}
async function fetchUsers() {
  const { data } = await apiClient.get<AdminUser[]>('/api/admin/users')
  return data
}

export function AdminTeamsPage() {
  const qc = useQueryClient()
  const { success, error } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [defaultRoleId, setDefaultRoleId] = useState('')

  const { data: teams, isLoading } = useQuery({ queryKey: ['admin-teams'], queryFn: fetchTeams })
  const { data: roles } = useQuery({ queryKey: ['admin-roles'], queryFn: fetchRoles })
  const { data: users } = useQuery({ queryKey: ['admin-users'], queryFn: fetchUsers })

  const memberCount = (teamId: number) =>
    (users ?? []).filter(u => u.team_id === teamId).length

  const createTeam = useMutation({
    mutationFn: () =>
      apiClient.post('/api/admin/teams', {
        name,
        description,
        default_role_id: defaultRoleId ? Number(defaultRoleId) : null,
      }),
    onSuccess: () => {
      success(`Team "${name}" created`)
      setName('')
      setDescription('')
      setDefaultRoleId('')
      qc.invalidateQueries({ queryKey: ['admin-teams'] })
    },
    onError: () => error('Failed to create team'),
  })

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <h1 className="adm-page-title">Teams</h1>
        <p className="adm-page-sub">Group platform users into teams with default roles.</p>
      </div>

      <form
        className="adm-create-form"
        onSubmit={(e: FormEvent) => { e.preventDefault(); if (name.trim()) createTeam.mutate() }}
      >
        <input
          className="adm-input"
          placeholder="Team name"
          required
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="adm-input adm-input--wide"
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <select
          className="adm-select"
          value={defaultRoleId}
          onChange={e => setDefaultRoleId(e.target.value)}
        >
          <option value="">Default role (optional)</option>
          {(roles ?? []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button type="submit" className="adm-btn adm-btn--primary" disabled={createTeam.isPending}>
          {createTeam.isPending ? 'Creating…' : 'Create team'}
        </button>
      </form>

      {isLoading && <p className="adm-loading">Loading teams…</p>}
      {!isLoading && (!teams || teams.length === 0) && (
        <div className="adm-empty">
          <span className="adm-empty-icon">🏢</span>
          <p>No teams yet. Create one above.</p>
        </div>
      )}

      <div className="adm-cards">
        {(teams ?? []).map(team => {
          const count = memberCount(team.id)
          const defRole = roles?.find(r => r.id === team.default_role_id)
          return (
            <div key={team.id} className="adm-card">
              <div className="adm-card-header">
                <div className="adm-team-name">{team.name}</div>
                <div className="adm-team-meta">
                  <span className="adm-meta-pill">{count} member{count !== 1 ? 's' : ''}</span>
                  {defRole && (
                    <span className={`adm-role-badge adm-role--${defRole.name.toLowerCase()}`}>
                      default: {defRole.name}
                    </span>
                  )}
                </div>
              </div>
              {team.description && <p className="adm-card-desc">{team.description}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
