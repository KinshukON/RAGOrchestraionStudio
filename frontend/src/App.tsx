import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { LandingPage } from './modules/auth/LandingPage'
import { AppShell } from './modules/layout/AppShell'
import { WorkflowBuilderPage } from './modules/workflow-builder/WorkflowBuilderPage'
import { QueryStudioPage } from './modules/query-studio/QueryStudioPage'
import { AuthProvider, useAuth } from './modules/auth/AuthContext'
import { ArchitectureCatalogPage } from './modules/architecture-catalog/ArchitectureCatalogPage'
import { DesignerPage } from './modules/guided-designer/DesignerPage'
import { QueryLabPage } from './modules/query-lab/QueryLabPage'
import { IntegrationsStudioPage } from './modules/integrations-studio/IntegrationsStudioPage'
import { EnvironmentsPage } from './modules/environments/EnvironmentsPage'
import { GovernancePage } from './modules/governance/GovernancePage'
import { ObservabilityPage } from './modules/observability/ObservabilityPage'
import { AdminUsersPage } from './modules/admin-users/AdminUsersPage'
import { AdminRolesPage } from './modules/admin-roles/AdminRolesPage'
import { AdminTeamsPage } from './modules/admin-teams/AdminTeamsPage'
import { AdminViewsPage } from './modules/admin-views/AdminViewsPage'
import { AdminPreferencesPage } from './modules/admin-preferences/AdminPreferencesPage'
import { AdminObservabilityPage } from './modules/admin-observability/AdminObservabilityPage'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return children
}

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<ArchitectureCatalogPage />} />
          <Route path="workflow-builder" element={<WorkflowBuilderPage />} />
          <Route path="designer" element={<DesignerPage />} />
          {/* Preserve the existing query-studio route for backward compatibility while adding query-lab as the primary entry. */}
          <Route path="query-studio" element={<QueryStudioPage />} />
          <Route path="query-lab" element={<QueryLabPage />} />
          <Route path="integrations" element={<IntegrationsStudioPage />} />
          <Route path="environments" element={<EnvironmentsPage />} />
          <Route path="governance" element={<GovernancePage />} />
          <Route path="observability" element={<ObservabilityPage />} />
          {/* Admin section retains detailed routes but is grouped under a single Admin nav item in the shell. */}
          <Route path="admin/integrations" element={<IntegrationsStudioPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="admin/roles" element={<AdminRolesPage />} />
          <Route path="admin/teams" element={<AdminTeamsPage />} />
          <Route path="admin/views" element={<AdminViewsPage />} />
          <Route path="admin/preferences" element={<AdminPreferencesPage />} />
          <Route path="admin/observability" element={<AdminObservabilityPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  )
}
