import type { FormEvent } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import { useToast } from '../ui/ToastContext'
import '../admin-users/admin.css'

type AdminRole = {
  id: number
  name: string
  description: string
  permissions?: Record<string, boolean>
}

const PERM_LABELS: Record<string, string> = {
  manageUsers: 'Manage Users',
  manageRoles: 'Manage Roles',
  manageTeams: 'Manage Teams',
  manageIntegrations: 'Manage Integrations',
  viewObservability: 'View Observability',
  viewWorkflows: 'View Workflows',
  editWorkflows: 'Edit Workflows',
}

async function fetchRoles() {
  const { data } = await apiClient.get<AdminRole[]>('/api/admin/roles')
  return data
}

export function AdminRolesPage() {
  const qc = useQueryClient()
  const { success, error } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const { data: roles, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: fetchRoles,
  })

  const createRole = useMutation({
    mutationFn: () => apiClient.post('/api/admin/roles', { name: newName, description: newDesc }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] })
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      success(`Role "${newName}" created`)
    },
    onError: () => error('Failed to create role'),
  })

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <h1 className="adm-page-title">Roles</h1>
        <p className="adm-page-sub">Define platform roles and their permission sets.</p>
        <button className="adm-btn adm-btn--primary" onClick={() => setShowCreate(x => !x)}>
          + New role
        </button>
      </div>

      {showCreate && (
        <form
          className="adm-create-form"
          onSubmit={(e: FormEvent) => { e.preventDefault(); createRole.mutate() }}
        >
          <input
            className="adm-input"
            placeholder="Role name"
            required
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
          <input
            className="adm-input"
            placeholder="Description"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
          />
          <button type="submit" className="adm-btn adm-btn--primary" disabled={createRole.isPending}>
            {createRole.isPending ? 'Creating…' : 'Create'}
          </button>
          <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setShowCreate(false)}>
            Cancel
          </button>
        </form>
      )}

      {isLoading && <p className="adm-loading">Loading roles…</p>}

      <div className="adm-cards">
        {(roles ?? []).map(role => (
          <div key={role.id} className="adm-card">
            <div className="adm-card-header">
              <span className={`adm-role-badge adm-role--${role.name.toLowerCase()}`}>
                {role.name}
              </span>
              <p className="adm-card-desc">{role.description}</p>
            </div>
            {role.permissions && Object.keys(role.permissions).length > 0 && (
              <div className="adm-perms">
                {Object.entries(PERM_LABELS).map(([key, label]) => {
                  const granted = role.permissions?.[key]
                  return (
                    <div key={key} className={`adm-perm-item ${granted ? 'adm-perm--on' : 'adm-perm--off'}`}>
                      <span className="adm-perm-check">{granted ? '✓' : '✗'}</span>
                      {label}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
