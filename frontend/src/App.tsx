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
import { UserGuidePage } from './modules/user-guide/UserGuidePage'
import { EvaluationPage } from './modules/evaluation/EvaluationPage'
import { ResearchAssistantPage } from './modules/research-assistant/ResearchAssistantPage'
import { CostRoiPage } from './modules/cost-roi/CostRoiPage'
import { IndustryPacksPage } from './modules/industry-packs/IndustryPacksPage'
import { ExecutiveSummaryPage } from './modules/executive-summary/ExecutiveSummaryPage'
import { ErrorBoundary } from './modules/ui/ErrorBoundary'
import { ToastProvider } from './modules/ui/ToastContext'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return children
}

/** Wraps a page element in an ErrorBoundary named after the section. */
function Page({ name, children }: { name: string; children: ReactNode }) {
  return <ErrorBoundary section={name}>{children}</ErrorBoundary>
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
          <Route index element={<Page name="Architecture Catalog"><ArchitectureCatalogPage /></Page>} />
          <Route path="workflow-builder" element={<Page name="Workflow Builder"><WorkflowBuilderPage /></Page>} />
          <Route path="designer" element={<Page name="Guided Designer"><DesignerPage /></Page>} />
          <Route path="query-studio" element={<Page name="Query Studio"><QueryStudioPage /></Page>} />
          <Route path="query-lab" element={<Page name="Query Lab"><QueryLabPage /></Page>} />
          <Route path="integrations" element={<Page name="Integrations"><IntegrationsStudioPage /></Page>} />
          <Route path="environments" element={<Page name="Environments"><EnvironmentsPage /></Page>} />
          <Route path="governance" element={<Page name="Governance"><GovernancePage /></Page>} />
          <Route path="observability" element={<Page name="Observability"><ObservabilityPage /></Page>} />
          <Route path="admin/integrations" element={<Page name="Admin › Integrations"><IntegrationsStudioPage /></Page>} />
          <Route path="admin/users" element={<Page name="Admin › Users"><AdminUsersPage /></Page>} />
          <Route path="admin/roles" element={<Page name="Admin › Roles"><AdminRolesPage /></Page>} />
          <Route path="admin/teams" element={<Page name="Admin › Teams"><AdminTeamsPage /></Page>} />
          <Route path="admin/views" element={<Page name="Admin › Views"><AdminViewsPage /></Page>} />
          <Route path="admin/preferences" element={<Page name="Admin › Preferences"><AdminPreferencesPage /></Page>} />
          <Route path="admin/observability" element={<Page name="Admin › Observability"><AdminObservabilityPage /></Page>} />
          <Route path="guide" element={<Page name="User Guide"><UserGuidePage /></Page>} />
          <Route path="evaluation" element={<Page name="Evaluation Harness"><EvaluationPage /></Page>} />
          <Route path="research-assistant" element={<Page name="Research Assistant"><ResearchAssistantPage /></Page>} />
          <Route path="cost-roi" element={<Page name="Cost &amp; ROI"><CostRoiPage /></Page>} />
          <Route path="industry-packs" element={<Page name="Industry Packs"><IndustryPacksPage /></Page>} />
          <Route path="executive-summary" element={<Page name="Executive Summary"><ExecutiveSummaryPage /></Page>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ToastProvider>
  )
}
