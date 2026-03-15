import type { FormEvent } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../ui/ToastContext'
import './admin.css'

// ── Types ────────────────────────────────────────────────────────────────────
type AdminRole   = { id: number; name: string; description: string; permissions?: Record<string, boolean> }
type AdminTeam   = { id: number; name: string; description: string }
type AdminUser   = {
  id: number; name: string; email: string
  role_id: number | null; team_id: number | null
  is_active: boolean | null; role_name: string | null; team_name: string | null
}
type UserSession = {
  id: number; user_id: number; created_at: string; last_activity_at: string
  ip: string | null; user_agent: string | null; status: string
}
type AuditEntry  = {
  id: number; timestamp: string; user_id: number | null; session_id: number | null
  action: string; resource_type: string; resource_id: string
  event_data: Record<string, unknown>; ip: string | null
}

// ── API helpers ───────────────────────────────────────────────────────────────
const fetchUsers   = () => apiClient.get<AdminUser[]>('/api/admin/users').then(r => r.data)
const fetchRoles   = () => apiClient.get<AdminRole[]>('/api/admin/roles').then(r => r.data)
const fetchTeams   = () => apiClient.get<AdminTeam[]>('/api/admin/teams').then(r => r.data)
const fetchSessions = (userId: number) =>
  apiClient.get<UserSession[]>(`/api/admin/sessions?user_id=${userId}`).then(r => r.data)
const fetchAuditLogs = (userId: number) =>
  apiClient.get<AuditEntry[]>(`/api/admin/observability/audit-logs?limit=50`).then(r =>
    r.data.filter(e => e.user_id === userId)
  )

function fmt(dt: string) {
  return new Date(dt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function relTime(dt: string) {
  const ms = Date.now() - new Date(dt).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const ROLE_ICON: Record<string, string> = { 'Platform Admin': '👑', 'AI Architect': '🏗️', 'Knowledge Engineer': '🧠', Auditor: '🔍', Viewer: '👁️', Admin: '🛡️', Editor: '✏️' }

// ── Main component ─────────────────────────────────────────────────────────────
export function AdminUsersPage() {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const { success, error } = useToast()
  const [editingId, setEditingId]     = useState<number | null>(null)
  const [selectedId, setSelectedId]   = useState<number | null>(null)
  const [detailTab, setDetailTab]     = useState<'sessions' | 'audit'>('sessions')

  const { data: users, isLoading } = useQuery({ queryKey: ['admin-users'],  queryFn: fetchUsers })
  const { data: roles }            = useQuery({ queryKey: ['admin-roles'],   queryFn: fetchRoles })
  const { data: teams }            = useQuery({ queryKey: ['admin-teams'],   queryFn: fetchTeams })

  const selectedUser = users?.find(u => u.id === selectedId) ?? null

  // sessions + audit for selected user
  const { data: sessions, isLoading: sessLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['admin-sessions', selectedId],
    queryFn: () => fetchSessions(selectedId!),
    enabled: typeof selectedId === 'number',
  })
  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['admin-audit', selectedId],
    queryFn: () => fetchAuditLogs(selectedId!),
    enabled: typeof selectedId === 'number',
  })

  // bootstrap
  const bootstrap = useMutation({
    mutationFn: () => apiClient.post('/api/admin/users/bootstrap', { email: me?.email, name: me?.name, external_subject: me?.id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
  useState(() => { if (me) bootstrap.mutate() })

  const updateUser = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AdminUser> }) =>
      apiClient.patch(`/api/admin/users/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setEditingId(null); success('User updated') },
    onError: () => error('Update failed'),
  })

  const deactivateUser = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/admin/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); success('User deactivated') },
    onError: () => error('Deactivation failed'),
  })

  const revokeSession = useMutation({
    mutationFn: (sessionId: number) => apiClient.patch(`/api/admin/sessions/${sessionId}/revoke`, {}),
    onSuccess: () => { refetchSessions(); success('Session revoked') },
    onError: () => error('Failed to revoke session'),
  })

  const revokeAllSessions = useMutation({
    mutationFn: (userId: number) => apiClient.delete(`/api/admin/sessions/by-user/${userId}`),
    onSuccess: () => { refetchSessions(); success('All sessions revoked') },
    onError: () => error('Failed to revoke sessions'),
  })

  return (
    <div className="adm-page adm-page--split">
      {/* ── Left: user list ─────────────────────────── */}
      <div className="adm-list-col">
        <div className="adm-page-header">
          <h1 className="adm-page-title">Users</h1>
          <p className="adm-page-sub">Manage roles, team membership, access status, sessions, and audit trail.</p>
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
                  <th>User</th><th>Email</th><th>Role</th><th>Team</th><th>Status</th><th>Actions</th>
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
                    isSelected={selectedId === u.id}
                    onSelect={() => { setSelectedId(prev => prev === u.id ? null : u.id); setDetailTab('sessions') }}
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

      {/* ── Right: drill-down panel ──────────────────── */}
      {selectedUser && (
        <div className="adm-detail-panel">
          <div className="adm-detail-header">
            <div className="adm-detail-avatar">{(selectedUser.name || selectedUser.email)[0].toUpperCase()}</div>
            <div>
              <div className="adm-detail-name">{selectedUser.name || selectedUser.email}</div>
              <div className="adm-detail-email">{selectedUser.email}</div>
              <div className="adm-detail-meta">
                <span className={`adm-status adm-status--${selectedUser.is_active === false ? 'inactive' : 'active'}`}>
                  {selectedUser.is_active === false ? 'Inactive' : 'Active'}
                </span>
                {selectedUser.role_name && (
                  <span className={`adm-role-badge adm-role--${selectedUser.role_name.toLowerCase().replace(' ', '-')}`}>
                    {ROLE_ICON[selectedUser.role_name] ?? '·'} {selectedUser.role_name}
                  </span>
                )}
              </div>
            </div>
            <button className="adm-panel-close" onClick={() => setSelectedId(null)} aria-label="Close">✕</button>
          </div>

          {/* Tabs */}
          <div className="adm-detail-tabs">
            <button className={`adm-tab ${detailTab === 'sessions' ? 'adm-tab--active' : ''}`} onClick={() => setDetailTab('sessions')}>
              🔑 Sessions {sessions ? `(${sessions.filter(s => s.status === 'active').length} active)` : ''}
            </button>
            <button className={`adm-tab ${detailTab === 'audit' ? 'adm-tab--active' : ''}`} onClick={() => setDetailTab('audit')}>
              📋 Audit Log {auditLogs ? `(${auditLogs.length})` : ''}
            </button>
          </div>

          {/* Sessions Tab */}
          {detailTab === 'sessions' && (
            <div className="adm-detail-body">
              {sessions && sessions.filter(s => s.status === 'active').length > 1 && (
                <div className="adm-panel-actions">
                  <button
                    className="adm-btn adm-btn--danger adm-btn--sm"
                    onClick={() => revokeAllSessions.mutate(selectedUser.id)}
                    disabled={revokeAllSessions.isPending}
                  >
                    ⛔ Revoke all sessions
                  </button>
                </div>
              )}
              {sessLoading && <p className="adm-loading">Loading sessions…</p>}
              {!sessLoading && (!sessions || sessions.length === 0) && (
                <p className="adm-empty-hint">No sessions found for this user.</p>
              )}
              {sessions && sessions.length > 0 && (
                <div className="adm-session-list">
                  {sessions.map(s => (
                    <div key={s.id} className={`adm-session-card adm-session-card--${s.status}`}>
                      <div className="adm-session-meta">
                        <span className={`adm-session-status-dot adm-session-status-dot--${s.status}`} />
                        <span className="adm-session-label">
                          {s.status === 'active' ? '🟢 Active' : '⛔ Revoked'}
                        </span>
                        <span className="adm-session-time" title={fmt(s.created_at)}>
                          Started {relTime(s.created_at)}
                        </span>
                        <span className="adm-session-time" title={fmt(s.last_activity_at)}>
                          · Last seen {relTime(s.last_activity_at)}
                        </span>
                      </div>
                      <div className="adm-session-details">
                        {s.ip && <span className="adm-session-pill">🌐 {s.ip}</span>}
                        {s.user_agent && (
                          <span className="adm-session-pill" title={s.user_agent}>
                            🖥 {s.user_agent.length > 40 ? s.user_agent.slice(0, 40) + '…' : s.user_agent}
                          </span>
                        )}
                      </div>
                      {s.status === 'active' && (
                        <button
                          className="adm-btn adm-btn--ghost adm-btn--sm adm-session-revoke"
                          onClick={() => revokeSession.mutate(s.id)}
                          disabled={revokeSession.isPending}
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Audit Tab */}
          {detailTab === 'audit' && (
            <div className="adm-detail-body">
              {auditLoading && <p className="adm-loading">Loading audit log…</p>}
              {!auditLoading && (!auditLogs || auditLogs.length === 0) && (
                <p className="adm-empty-hint">No audit events recorded for this user yet.</p>
              )}
              {auditLogs && auditLogs.length > 0 && (
                <div className="adm-audit-list">
                  {auditLogs.map(e => (
                    <div key={e.id} className="adm-audit-entry">
                      <div className="adm-audit-time">{fmt(e.timestamp)}</div>
                      <div className="adm-audit-main">
                        <span className="adm-audit-action">{e.action}</span>
                        <span className="adm-audit-resource">
                          {e.resource_type}
                          {e.resource_id && e.resource_id !== '—' && <> › <code>{e.resource_id}</code></>}
                        </span>
                      </div>
                      {e.ip && <span className="adm-audit-ip">🌐 {e.ip}</span>}
                      {Object.keys(e.event_data).length > 0 && (
                        <details className="adm-audit-data">
                          <summary>Details</summary>
                          <pre>{JSON.stringify(e.event_data, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── UserRow ───────────────────────────────────────────────────────────────────
function UserRow({ user, roles, teams, isMe, isEditing, isSelected, onSelect, onEdit, onCancel, onSave, onDeactivate, isSaving }: {
  user: AdminUser; roles: AdminRole[]; teams: AdminTeam[]
  isMe: boolean; isEditing: boolean; isSelected: boolean
  onSelect: () => void; onEdit: () => void; onCancel: () => void
  onSave: (p: Partial<AdminUser>) => void; onDeactivate: () => void; isSaving: boolean
}) {
  const [roleId, setRoleId] = useState<string>(String(user.role_id ?? ''))
  const [teamId, setTeamId] = useState<string>(String(user.team_id ?? ''))

  const roleName = user.role_name ?? (roles.find(r => r.id === user.role_id)?.name ?? null)

  function handleSave(e: FormEvent) {
    e.preventDefault()
    onSave({ role_id: roleId ? Number(roleId) : null, team_id: teamId ? Number(teamId) : null })
  }

  return (
    <tr
      className={`adm-row ${!user.is_active ? 'adm-row--inactive' : ''} ${isMe ? 'adm-row--me' : ''} ${isSelected ? 'adm-row--selected' : ''}`}
      onClick={(e) => { if ((e.target as HTMLElement).closest('button,select,form')) return; onSelect() }}
      style={{ cursor: 'pointer' }}
    >
      <td>
        <div className="adm-user-cell">
          <div className="adm-avatar">{(user.name || user.email)[0].toUpperCase()}</div>
          <span>{user.name || '—'} {isMe && <span className="adm-you-badge">you</span>}</span>
        </div>
      </td>
      <td className="adm-email">{user.email}</td>
      <td>
        {isEditing ? (
          <select className="adm-select" value={roleId} onChange={e => setRoleId(e.target.value)}>
            <option value="">— no role —</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        ) : (
          <span className={`adm-role-badge adm-role--${(roleName ?? '').toLowerCase().replace(' ', '-')}`}>
            {ROLE_ICON[roleName ?? ''] ?? '·'} {roleName ?? <span className="adm-unset">unassigned</span>}
          </span>
        )}
      </td>
      <td>
        {isEditing ? (
          <select className="adm-select" value={teamId} onChange={e => setTeamId(e.target.value)}>
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
      <td onClick={e => e.stopPropagation()}>
        {isEditing ? (
          <form onSubmit={handleSave} style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="submit" className="adm-btn adm-btn--primary" disabled={isSaving}>{isSaving ? '…' : 'Save'}</button>
            <button type="button" className="adm-btn adm-btn--ghost" onClick={onCancel}>Cancel</button>
          </form>
        ) : (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button className="adm-btn adm-btn--secondary" onClick={onEdit}>Edit</button>
            {!isMe && user.is_active !== false && (
              <button className="adm-btn adm-btn--danger" onClick={onDeactivate}>Deactivate</button>
            )}
          </div>
        )}
      </td>
    </tr>
  )
}
