import type { FormEvent } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../ui/ToastContext'
import './admin.css'

type AdminRole = { id: number; name: string; description: string; permissions?: Record<string, boolean> }
type AdminTeam = { id: number; name: string; description: string }
type AdminUser = {
  id: number
  name: string
  email: string
  role_id: number | null
  team_id: number | null
  is_active: boolean | null
  role_name: string | null
  team_name: string | null
}

async function fetchUsers() {
  const { data } = await apiClient.get<AdminUser[]>('/api/admin/users')
  return data
}
async function fetchRoles() {
  const { data } = await apiClient.get<AdminRole[]>('/api/admin/roles')
  return data
}
async function fetchTeams() {
  const { data } = await apiClient.get<AdminTeam[]>('/api/admin/teams')
  return data
}

const ROLE_ICON: Record<string, string> = {
  Admin: '🛡️',
  Editor: '✏️',
  Viewer: '👁️',
}

export function AdminUsersPage() {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const { success, error } = useToast()
  const [editingId, setEditingId] = useState<number | null>(null)

  const { data: users, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: fetchUsers })
  const { data: roles } = useQuery({ queryKey: ['admin-roles'], queryFn: fetchRoles })
  const { data: teams } = useQuery({ queryKey: ['admin-teams'], queryFn: fetchTeams })

  // Bootstrap current user on page load
  const bootstrap = useMutation({
    mutationFn: () => apiClient.post('/api/admin/users/bootstrap', {
      email: me?.email,
      name: me?.name,
      external_subject: me?.id,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
  // Run once
  useState(() => { if (me) bootstrap.mutate() })

  const updateUser = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AdminUser> }) =>
      apiClient.patch(`/api/admin/users/${id}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setEditingId(null)
      success('User updated')
    },
    onError: () => error('Update failed'),
  })

  const deactivateUser = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/admin/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      success('User deactivated')
    },
    onError: () => error('Deactivation failed'),
  })

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <h1 className="adm-page-title">Users</h1>
        <p className="adm-page-sub">Manage roles, team membership, and access status for platform users.</p>
      </div>

      {isLoading && <p className="adm-loading">Loading users…</p>}
      {!isLoading && (!users || users.length === 0) && (
        <div className="adm-empty">
          <span className="adm-empty-icon">👥</span>
          <p>No users yet. Users appear here after first login.</p>
        </div>
      )}

      {!isLoading && users && users.length > 0 && (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Team</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <UserRow
                  key={u.id}
                  user={u}
                  roles={roles ?? []}
                  teams={teams ?? []}
                  isMe={u.email === me?.email}
                  isEditing={editingId === u.id}
                  onEdit={() => setEditingId(u.id)}
                  onCancel={() => setEditingId(null)}
                  onSave={(payload) => updateUser.mutate({ id: u.id, payload })}
                  onDeactivate={() => deactivateUser.mutate(u.id)}
                  isSaving={updateUser.isPending}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function UserRow({
  user, roles, teams, isMe, isEditing,
  onEdit, onCancel, onSave, onDeactivate, isSaving,
}: {
  user: AdminUser
  roles: AdminRole[]
  teams: AdminTeam[]
  isMe: boolean
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (p: Partial<AdminUser>) => void
  onDeactivate: () => void
  isSaving: boolean
}) {
  const [roleId, setRoleId] = useState<string>(String(user.role_id ?? ''))
  const [teamId, setTeamId] = useState<string>(String(user.team_id ?? ''))

  const roleName = user.role_name ?? (roles.find(r => r.id === user.role_id)?.name ?? null)

  function handleSave(e: FormEvent) {
    e.preventDefault()
    onSave({
      role_id: roleId ? Number(roleId) : null,
      team_id: teamId ? Number(teamId) : null,
    })
  }

  return (
    <tr className={`adm-row ${!user.is_active ? 'adm-row--inactive' : ''} ${isMe ? 'adm-row--me' : ''}`}>
      <td>
        <div className="adm-user-cell">
          <div className="adm-avatar">{(user.name || user.email)[0].toUpperCase()}</div>
          <span>{user.name || '—'}
            {isMe && <span className="adm-you-badge">you</span>}
          </span>
        </div>
      </td>
      <td className="adm-email">{user.email}</td>
      <td>
        {isEditing ? (
          <select
            className="adm-select"
            value={roleId}
            onChange={e => setRoleId(e.target.value)}
          >
            <option value="">— no role —</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        ) : (
          <span className={`adm-role-badge adm-role--${(roleName ?? '').toLowerCase()}`}>
            {ROLE_ICON[roleName ?? ''] ?? '·'} {roleName ?? <span className="adm-unset">unassigned</span>}
          </span>
        )}
      </td>
      <td>
        {isEditing ? (
          <select
            className="adm-select"
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
          >
            <option value="">— no team —</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        ) : (
          <span className="adm-team-label">{user.team_name ?? <span className="adm-unset">—</span>}</span>
        )}
      </td>
      <td>
        <span className={`adm-status adm-status--${user.is_active === false ? 'inactive' : 'active'}`}>
          {user.is_active === false ? 'Inactive' : 'Active'}
        </span>
      </td>
      <td>
        {isEditing ? (
          <form onSubmit={handleSave} style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="submit" className="adm-btn adm-btn--primary" disabled={isSaving}>
              {isSaving ? '…' : 'Save'}
            </button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onCancel}>Cancel</button>
          </form>
        ) : (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button className="adm-btn adm-btn--secondary" onClick={onEdit}>Edit</button>
            {!isMe && user.is_active !== false && (
              <button
                className="adm-btn adm-btn--danger"
                onClick={onDeactivate}
              >
                Deactivate
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}
