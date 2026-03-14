/** Shared UI feedback primitives – use these across all module pages. */

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/** Colour-coded status badge using global .badge utility classes from index.css */
export function StatusBadge({ status, label }: { status: BadgeVariant; label?: string }) {
  const display = label ?? status
  return <span className={`badge badge--${status}`}>{display}</span>
}

/** Derive a badge variant from common status strings */
export function statusVariant(raw?: string | null): BadgeVariant {
  if (!raw) return 'neutral'
  const s = raw.toLowerCase()
  if (['active', 'healthy', 'approved', 'live', 'success', 'completed', 'passed'].some(k => s.includes(k))) return 'success'
  if (['pending', 'in_progress', 'draft', 'running', 'warning'].some(k => s.includes(k))) return 'warning'
  if (['failed', 'error', 'revoked', 'rejected', 'danger'].some(k => s.includes(k))) return 'danger'
  if (['info', 'simulated', 'demo'].some(k => s.includes(k))) return 'info'
  return 'neutral'
}

/** Page-level empty state */
export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string
  description?: string
  icon?: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      <div className="empty-state__title">{title}</div>
      {description && <div className="empty-state__desc">{description}</div>}
      {action && (
        <button
          type="button"
          className="empty-state__action"
          onClick={action.onClick}
          style={{ marginTop: '.75rem', padding: '.45rem 1rem', borderRadius: '.5rem', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '.9rem' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}


/** Inline loading indicator */
export function LoadingMessage({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading-msg">
      <span style={{ opacity: 0.6, fontSize: '1rem' }}>⏳</span>
      {label}
    </div>
  )
}

/** Simulated-mode notice banner */
export function SimBanner({ text = 'Results are simulated until a real execution backend is connected.' }: { text?: string }) {
  return (
    <div className="sim-banner">
      <span>⚠</span>
      {text}
    </div>
  )
}

/** Page header compound component */
export function PageHeader({
  title,
  description,
  action,
  simulated,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  simulated?: boolean
}) {
  return (
    <div className="page-header">
      <div className="page-header-row">
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
          {simulated && <SimBanner />}
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  )
}
