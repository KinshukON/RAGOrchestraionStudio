import { useAuth } from './AuthContext'

export type PermissionKey =
  | 'manageUsers'
  | 'manageRoles'
  | 'manageTeams'
  | 'viewObservability'
  | 'manageIntegrations'
  | 'viewWorkflows'
  | 'editWorkflows'

export function useHasPermission(permission: PermissionKey) {
  const { user } = useAuth()
  const perms = (user as any)?.permissions as Record<string, boolean> | undefined
  if (!perms) return false
  return perms[permission] === true
}

export function Can(props: { permission: PermissionKey; children: React.ReactNode }) {
  const allowed = useHasPermission(props.permission)
  if (!allowed) return null
  return <>{props.children}</>
}

