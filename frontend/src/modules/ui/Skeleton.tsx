/** Lightweight skeleton loading primitives */

/** Single skeleton bar — width and height are fully configurable */
export function SkeletonBar({
    width = '100%',
    height = '1rem',
    radius = '4px',
    style,
}: {
    width?: string | number
    height?: string | number
    radius?: string
    style?: React.CSSProperties
}) {
    return (
        <div
            style={{
                width,
                height,
                borderRadius: radius,
                background: 'linear-gradient(90deg, var(--color-surface-alt, #1e293b) 25%, var(--color-surface-hover, #263042) 50%, var(--color-surface-alt, #1e293b) 75%)',
                backgroundSize: '200% 100%',
                animation: 'skeleton-shimmer 1.4s infinite',
                ...style,
            }}
        />
    )
}

/** Generic card skeleton — mimics a standard list-card */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
    return (
        <div
            style={{
                padding: '1rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid var(--color-border, #1e293b)',
                background: 'var(--color-surface, #0f172a)',
                display: 'flex',
                flexDirection: 'column',
                gap: '.625rem',
            }}
        >
            <SkeletonBar width="55%" height="1.1rem" radius="5px" />
            {Array.from({ length: lines }).map((_, i) => (
                <SkeletonBar key={i} width={i === lines - 1 ? '40%' : '100%'} height=".8rem" />
            ))}
        </div>
    )
}

/** Grid of skeleton cards — use while a list page is loading */
export function SkeletonGrid({ count = 3, columns = 3 }: { count?: number; columns?: number }) {
    return (
        <>
            <style>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columns}, minmax(220px, 1fr))`,
                    gap: '1rem',
                }}
            >
                {Array.from({ length: count }).map((_, i) => (
                    <SkeletonCard key={i} lines={3} />
                ))}
            </div>
        </>
    )
}

/** Full-page loading skeleton — header + grid */
export function PageSkeleton({
    title = true,
    cards = 3,
    columns = 3,
}: {
    title?: boolean
    cards?: number
    columns?: number
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem 0' }}>
            <style>{`@keyframes skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            {title && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    <SkeletonBar width="220px" height="1.6rem" radius="6px" />
                    <SkeletonBar width="440px" height=".875rem" />
                </div>
            )}
            <SkeletonGrid count={cards} columns={columns} />
        </div>
    )
}

/** Table skeleton — header + rows */
export function SkeletonTable({ rows = 4, cols = 5 }: { rows?: number; cols?: number }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <style>{`@keyframes skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
            {/* header row */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0 1rem', padding: '.625rem 1rem', borderBottom: '1px solid var(--color-border, #1e293b)' }}>
                {Array.from({ length: cols }).map((_, i) => (
                    <SkeletonBar key={i} height=".75rem" width="60%" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0 1rem', padding: '.75rem 1rem', borderBottom: '1px solid var(--color-border, #1e293b)', opacity: 1 - r * 0.12 }}>
                    {Array.from({ length: cols }).map((_, c) => (
                        <SkeletonBar key={c} height=".8rem" width={c === 0 ? '80%' : '55%'} />
                    ))}
                </div>
            ))}
        </div>
    )
}
