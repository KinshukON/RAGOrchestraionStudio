import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import './layout.css'
import { useAuth } from '../auth/AuthContext'

export function AppShell() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    signOut()
    navigate('/')
  }

  return (
    <div className="shell-root">
      <aside className="shell-sidebar">
        <div className="shell-logo">RAG Studio</div>
        <nav className="shell-nav">
          <NavLink to="/app" end className="shell-nav-item">
            Dashboard
          </NavLink>
          <NavLink to="/app/workflow-builder" className="shell-nav-item">
            Workflow Builder
          </NavLink>
          <NavLink to="/app/query-studio" className="shell-nav-item">
            Query Studio
          </NavLink>
          <NavLink to="/app/admin/integrations" className="shell-nav-item">
            Integrations Hub
          </NavLink>
        </nav>
      </aside>
      <div className="shell-main">
        <header className="shell-header">
          <div className="shell-breadcrumb">Control Plane</div>
          <div className="shell-user">
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

