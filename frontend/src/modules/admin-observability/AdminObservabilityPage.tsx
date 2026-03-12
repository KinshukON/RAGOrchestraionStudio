import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'

type AuditLog = {
  id: number
  timestamp: string
  user_id?: number | null
  session_id?: number | null
  action: string
  resource_type: string
  resource_id: string
}

type Metrics = {
  total_audit_logs: number
  total_events: number
}

async function fetchAuditLogs() {
  const { data } = await apiClient.get<AuditLog[]>('/api/admin/observability/audit-logs')
  return data
}

async function fetchMetrics() {
  const { data } = await apiClient.get<Metrics>('/api/admin/observability/metrics')
  return data
}

export function AdminObservabilityPage() {
  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ['admin-observability-logs'],
    queryFn: fetchAuditLogs,
  })

  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['admin-observability-metrics'],
    queryFn: fetchMetrics,
  })

  return (
    <div>
      <h1>Observability</h1>

      <section>
        <h2>Metrics</h2>
        {loadingMetrics && <p>Loading metrics…</p>}
        {!loadingMetrics && metrics && (
          <div>
            <p>Total audit logs: {metrics.total_audit_logs}</p>
            <p>Total events: {metrics.total_events}</p>
          </div>
        )}
      </section>

      <section>
        <h2>Audit logs</h2>
        {loadingLogs && <p>Loading audit logs…</p>}
        {!loadingLogs && (!logs || logs.length === 0) && <p>No audit logs yet.</p>}
        {!loadingLogs && logs && logs.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                  <td>{log.user_id ?? '—'}</td>
                  <td>{log.action}</td>
                  <td>
                    {log.resource_type}:{log.resource_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

