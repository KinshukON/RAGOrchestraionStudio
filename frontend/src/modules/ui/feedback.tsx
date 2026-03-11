export function LoadingMessage({ label }: { label: string }) {
  return <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{label}</p>
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <p style={{ fontSize: '0.85rem', color: '#fca5a5' }}>
      {message}
    </p>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ padding: '1.25rem', borderRadius: '0.75rem', border: '1px dashed #374151' }}>
      <h3 style={{ margin: 0, fontSize: '0.95rem' }}>{title}</h3>
      <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#9ca3af' }}>{description}</p>
    </div>
  )
}

