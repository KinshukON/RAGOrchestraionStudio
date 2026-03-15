import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import './layout.css'
import { useAuth, useHasPermission } from '../auth/AuthContext'
import { useToast } from '../ui/ToastContext'

// Minimal inline SVG icon helper
function Icon({ d, title }: { d: string; title: string }) {
  return (
    <svg className="shell-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <title>{title}</title>
      <path fillRule="evenodd" clipRule="evenodd" d={d} />
    </svg>
  )
}

// Hamburger / close toggle icon
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg className="shell-hamburger-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      {open ? (
        // X / close
        <path fillRule="evenodd" clipRule="evenodd"
          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
      ) : (
        // Hamburger
        <path fillRule="evenodd" clipRule="evenodd"
          d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
      )}
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

const EVIDENCE_NAV_ITEMS = [
  { to: '/app/evaluation', end: false, label: 'Evaluation Harness', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { to: '/app/research-assistant', end: false, label: 'Research Assistant', d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
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
  'evaluation': 'Evaluation Harness',
  'research-assistant': 'Research Assistant',
  'users': 'Users',
  'roles': 'Roles',
  'teams': 'Teams',
  'views': 'Views',
  'preferences': 'Preferences',
  'guide': 'User Guide',
}

function initials(name?: string) {
  if (!name) return '?'
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

const SIDEBAR_KEY = 'raagos_sidebar_collapsed'

export function AppShell() {
  const { user, isAuthenticated, signOut } = useAuth()
  const { success } = useToast()
  const welcomeFiredRef = useRef(false)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [isSeedLoading, setIsSeedLoading] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(SIDEBAR_KEY) === '1' } catch { return false }
  })

  // ── Welcome toast: fires once per session on first sign-in ─────────────
  useEffect(() => {
    if (!isAuthenticated || welcomeFiredRef.current) return
    const key = 'raagos_welcomed'
    if (sessionStorage.getItem(key)) return
    welcomeFiredRef.current = true
    sessionStorage.setItem(key, '1')
    const name = user?.name?.split(' ')[0] ?? 'there'
    const timeout = setTimeout(() => success(`Welcome back, ${name}! 👋`), 350)
    return () => clearTimeout(timeout)
  }, [isAuthenticated, user, success])


  function toggleSidebar() {
    setCollapsed(c => {
      const next = !c
      try { localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0') } catch { /* */ }
      return next
    })
  }

  async function triggerSeed() {
    setIsSeedLoading(true)
    try {
      await fetch('/api/demo/seed', { method: 'POST' })
      sessionStorage.setItem('rag_studio_demo_seeded', '1')
      queryClient.invalidateQueries()
    } catch {
      // Non-fatal
    } finally {
      setIsSeedLoading(false)
    }
  }

  // ── Auto-seed demo data on first session load ──────────────────────────
  useEffect(() => {
    const SEED_KEY = 'rag_studio_demo_seeded'
      ; (async () => {
        try {
          const res = await fetch('/api/demo/seed-status')
          const status = await res.json()
          if (!status.seeded) {
            sessionStorage.removeItem(SEED_KEY)
            await fetch('/api/demo/seed', { method: 'POST' })
            queryClient.invalidateQueries()
          }
          sessionStorage.setItem(SEED_KEY, '1')
        } catch {
          // Non-fatal
        }
      })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSignOut() {
    signOut()
    navigate('/')
  }

  const pathSegments = location.pathname.replace('/app', '').split('/').filter(Boolean)
  const currentLabel = ROUTE_LABELS[pathSegments[pathSegments.length - 1] ?? ''] ?? 'RAAGOS'

  const sidebarClass = `shell-sidebar${collapsed ? ' shell-sidebar--collapsed' : ''}`
  const isAdmin = useHasPermission('administer_platform')

  function NavItem({ item, end }: { item: { to: string; label: string; d: string; end?: boolean }; end?: boolean }) {
    return (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end ?? end}
        className="shell-nav-item"
        title={collapsed ? item.label : undefined}
      >
        <Icon d={item.d} title={item.label} />
        {!collapsed && <span className="shell-nav-label">{item.label}</span>}
      </NavLink>
    )
  }

  return (
    <div className="shell-root" data-sidebar-collapsed={collapsed ? 'true' : 'false'}>
      <aside className={sidebarClass}>
        {/* Hamburger toggle */}
        <button
          type="button"
          className="shell-hamburger"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <HamburgerIcon open={!collapsed} />
        </button>

        {/* Logo */}
        <div className="shell-logo">
          <img src="/raagos-favicon.png" alt="RAAGOS" className="shell-logo-icon" />
          {!collapsed && (
            <div className="shell-logo-text">
              <span className="shell-logo-mark">RAAGOS</span>
              <span className="shell-logo-sub">RAG Orchestration Studio</span>
            </div>
          )}
        </div>

        <nav className="shell-nav">
          {!collapsed && <span className="shell-nav-section">Architecture</span>}
          {NAV_ITEMS.map(item => <NavItem key={item.to} item={item} />)}

          {!collapsed && <span className="shell-nav-section">Evidence</span>}
          {EVIDENCE_NAV_ITEMS.map(item => <NavItem key={item.to} item={item} />)}

          {!collapsed && <span className="shell-nav-section">Admin</span>}
          {isAdmin && ADMIN_NAV_ITEMS.map(item => <NavItem key={item.to} item={item} />)}
          {!isAdmin && !collapsed && (
            <span className="shell-nav-item shell-nav-item--locked" title="Requires Platform Admin role">
              <svg className="shell-nav-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" /></svg>
              <span className="shell-nav-label">Admin (restricted)</span>
            </span>
          )}
        </nav>

        <div className="shell-seed-footer">
          <button
            type="button"
            className="shell-seed-btn"
            onClick={triggerSeed}
            disabled={isSeedLoading}
            title={collapsed ? 'Reload demo data' : 'Reload all demo data (integrations, environments, governance, workflows)'}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="shell-seed-icon" aria-hidden="true">
              <path fillRule="evenodd" clipRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" />
            </svg>
            {!collapsed && <span>{isSeedLoading ? 'Loading…' : 'Load demo data'}</span>}
          </button>
        </div>
      </aside>

      <div className="shell-main">
        <header className="shell-header">
          <div className="shell-breadcrumb">
            <span className="shell-breadcrumb-root">RAAGOS</span>
            <span className="shell-breadcrumb-sep">›</span>
            <span className="shell-breadcrumb-current">{currentLabel}</span>
          </div>
          <div className="shell-header-right">
            <NavLink to="/app/guide" className={({ isActive }) =>
              `shell-help-button${isActive ? ' shell-help-button--active' : ''}`
            }>
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              User Guide
            </NavLink>
            <div className="shell-user">
              <div className="shell-user-avatar" title={user?.name}>
                {initials(user?.name)}
              </div>
              <span className="shell-user-name">{user?.name}</span>
              <button className="shell-signout-button" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
