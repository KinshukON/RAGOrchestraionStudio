import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
    children: ReactNode
    /** Custom fallback — if omitted, default recovery UI is shown */
    fallback?: ReactNode
    /** Identifier for the section (e.g. "Query Lab") shown in default fallback */
    section?: string
}

interface State {
    hasError: boolean
    error: Error | null
}

/**
 * Class-based error boundary (React class required — hooks can't catch render errors).
 * Wrap each page-level route to prevent a single crash from white-screening the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // In production, send to your error-tracking service here.
        console.error('[ErrorBoundary]', error, info.componentStack)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback

            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '40vh',
                    gap: '1.25rem',
                    color: 'var(--color-text-secondary, #94a3b8)',
                    textAlign: 'center',
                    padding: '2rem',
                }}>
                    <div style={{ fontSize: '2.5rem' }}>⚠️</div>
                    <div>
                        <h2 style={{ color: 'var(--color-text, #e2e8f0)', margin: '0 0 .5rem' }}>
                            {this.props.section ? `${this.props.section} crashed` : 'Something went wrong'}
                        </h2>
                        <p style={{ margin: '0 0 1rem', fontSize: '.875rem', maxWidth: '420px' }}>
                            {this.state.error?.message ?? 'An unexpected error occurred in this section.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={this.handleReset}
                        style={{
                            padding: '.5rem 1.25rem',
                            borderRadius: '6px',
                            border: '1px solid var(--color-border, #334155)',
                            background: 'var(--color-surface, #1e293b)',
                            color: 'var(--color-text, #e2e8f0)',
                            cursor: 'pointer',
                            fontSize: '.875rem',
                        }}
                    >
                        Try again
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
