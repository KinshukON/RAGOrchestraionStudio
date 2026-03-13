import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import './layout.css'
import { useAuth } from '../auth/AuthContext'

// Minimal inline SVG icon helper
function Icon({ d, title }: { d: string; title: string }) {
  return (
    <svg className="shell-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <title>{title}</title>
      <path fillRule="evenodd" clipRule="evenodd" d={d} />
    </svg>
  )
}

const NAV_ITEMS = [
  { to: '/app', end: true, label: 'Catalog', d: 'M2 4a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm0 6a2 2 0 012-2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2v-6zm11 0a2 2 0 012-2h1a2 2 0 012 2v6a2 2 0 01-2 2h-1a2 2 0 01-2-2v-6z' },
  { to: '/app/designer', end: false, label: 'Guided Designer', d: 'M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zm-2.207 2.207L3 13.172V16h2.828l8.38-8.379-2.83-2.828z' },
  { to: '/app/workflow-builder', end: false, label: 'Workflow Builder', d: 'M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z' },
  { to: '/app/query-lab', end: false, label: 'Query Lab', d: 'M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.669 0-3.218.51-4.5 1.385V4.804z' },
  { to: '/app/integrations', end: false, label: 'Integrations', d: 'M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM6.293 6.293a1 1 0 011.414 0L8.414 7H10a1 1 0 110 2H8.414l-.707.707a1 1 0 01-1.414-1.414L7 7.586V6a1 1 0 00-1-1 1 1 0 010-2h.293zM10 12a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm4.707-4.707a1 1 0 010 1.414L14 9.414V11a1 1 0 11-2 0V9.414l-.707-.707a1 1 0 011.414-1.414L13 7.586V6a1 1 0 112 0v1.586l.707.707z' },
  { to: '/app/environments', end: false, label: 'Environments', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z' },
  { to: '/app/governance', end: false, label: 'Governance', d: 'M9 2a1 1 0 000 2h2a1 1 0 100-2H9z M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z' },
  { to: '/app/observability', end: false, label: 'Observability', d: 'M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z' },
]

const ADMIN_NAV_ITEMS = [
  { to: '/app/admin/users', label: 'Users', d: 'M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z' },
  { to: '/app/admin/roles', label: 'Roles', d: 'M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zm0 12a2 2 0 110-4 2 2 0 010 4z' },
  { to: '/app/admin/teams', label: 'Teams', d: 'M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 14.094A5.973 5.973 0 004 17v1H1v-1a3 3 0 013.75-2.906z' },
]

const ROUTE_LABELS: Record<string, string> = {
  '': 'Architecture Catalog',
  'designer': 'Guided Designer',
  'workflow-builder': 'Workflow Builder',
  'query-lab': 'Query Lab',
  'integrations': 'Integrations',
  'environments': 'Environments',
  'governance': 'Governance',
  'observability': 'Observability',
  'users': 'Users',
  'roles': 'Roles',
  'teams': 'Teams',
  'views': 'Views',
  'preferences': 'Preferences',
}

function initials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

export function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  function handleSignOut() {
    signOut()
    navigate('/')
  }

  // Derive breadcrumb from current path segment
  const pathSegments = location.pathname.replace('/app', '').split('/').filter(Boolean)
  const currentLabel = ROUTE_LABELS[pathSegments[pathSegments.length - 1] ?? ''] ?? 'RAG Studio'

  return (
    <div className="shell-root">
      <aside className="shell-sidebar">
        <div className="shell-logo">
          <span className="shell-logo-mark">RAG Studio</span>
          <span className="shell-logo-sub">Control Plane</span>
        </div>

        <nav className="shell-nav">
          <span className="shell-nav-section">Architecture</span>
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end} className="shell-nav-item">
              <Icon d={item.d} title={item.label} />
              {item.label}
            </NavLink>
          ))}

          <span className="shell-nav-section">Admin</span>
          {ADMIN_NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} className="shell-nav-item">
              <Icon d={item.d} title={item.label} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="shell-header">
          <div className="shell-breadcrumb">
            <span className="shell-breadcrumb-root">RAG Studio</span>
            <span className="shell-breadcrumb-sep">›</span>
            <span className="shell-breadcrumb-current">{currentLabel}</span>
          </div>
          <div className="shell-user">
            <div className="shell-user-avatar" title={user?.name}>
              {initials(user?.name)}
            </div>
            <span className="shell-user-name">{user?.name}</span>
            <button className="shell-signout-button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </header>
        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

