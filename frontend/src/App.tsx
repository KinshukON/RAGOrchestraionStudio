import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { LandingPage } from './modules/auth/LandingPage'
import { AppShell } from './modules/layout/AppShell'
import { DashboardPage } from './modules/dashboard/DashboardPage'
import { WorkflowBuilderPage } from './modules/workflow-builder/WorkflowBuilderPage'
import { QueryStudioPage } from './modules/query-studio/QueryStudioPage'
import { IntegrationsHubPage } from './modules/admin-integrations/IntegrationsHubPage'
import { AuthProvider, useAuth } from './modules/auth/AuthContext'

function ProtectedRoute({ children }: { children: JSX.Element }) {
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
