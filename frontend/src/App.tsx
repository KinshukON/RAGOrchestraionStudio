import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { LandingPage } from './modules/auth/LandingPage'
import { AppShell } from './modules/layout/AppShell'
import { DashboardPage } from './modules/dashboard/DashboardPage'
import { WorkflowBuilderPage } from './modules/workflow-builder/WorkflowBuilderPage'
import { QueryStudioPage } from './modules/query-studio/QueryStudioPage'
import { IntegrationsHubPage } from './modules/admin-integrations/IntegrationsHubPage'
import { AdminUsersPage } from './modules/admin-users/AdminUsersPage'
import { AdminRolesPage } from './modules/admin-roles/AdminRolesPage'
import { AdminTeamsPage } from './modules/admin-teams/AdminTeamsPage'
import { AdminViewsPage } from './modules/admin-views/AdminViewsPage'
import { AdminPreferencesPage } from './modules/admin-preferences/AdminPreferencesPage'
import { AdminObservabilityPage } from './modules/admin-observability/AdminObservabilityPage'
import { AuthProvider, useAuth } from './modules/auth/AuthContext'

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
          <Route index element={<DashboardPage />} />
          <Route path="workflow-builder" element={<WorkflowBuilderPage />} />
          <Route path="query-studio" element={<QueryStudioPage />} />
          <Route path="admin/integrations" element={<IntegrationsHubPage />} />
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
