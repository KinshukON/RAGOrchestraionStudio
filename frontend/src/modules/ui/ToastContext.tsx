import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
    type ReactNode,
} from 'react'

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
    id: string
    message: string
    variant: ToastVariant
    duration?: number // ms, default 4000
}

interface ToastContextValue {
    toast: (opts: Omit<Toast, 'id'>) => void
    success: (message: string) => void
    error: (message: string) => void
    warning: (message: string) => void
    info: (message: string) => void
}

// ────────────────────────────────────────────────────────────
// Context
// ────────────────────────────────────────────────────────────
const ToastCtx = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastCtx)
    if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
    return ctx
}

// ────────────────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])
    const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

    const dismiss = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
        clearTimeout(timers.current[id])
        delete timers.current[id]
    }, [])

    const toast = useCallback(
        ({ message, variant, duration = 4000 }: Omit<Toast, 'id'>) => {
            const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
            setToasts((prev) => [...prev.slice(-4), { id, message, variant, duration }])
            timers.current[id] = setTimeout(() => dismiss(id), duration)
        },
        [dismiss],
    )

    const success = useCallback((msg: string) => toast({ message: msg, variant: 'success' }), [toast])
    const error = useCallback((msg: string) => toast({ message: msg, variant: 'error', duration: 6000 }), [toast])
    const warning = useCallback((msg: string) => toast({ message: msg, variant: 'warning' }), [toast])
    const info = useCallback((msg: string) => toast({ message: msg, variant: 'info' }), [toast])

    const ICONS: Record<ToastVariant, string> = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ',
    }

    const BG: Record<ToastVariant, string> = {
        success: '#166534',
        error: '#7f1d1d',
        warning: '#78350f',
        info: '#1e3a5f',
    }

    const BORDER: Record<ToastVariant, string> = {
        success: '#16a34a',
        error: '#dc2626',
        warning: '#d97706',
        info: '#3b82f6',
    }

    return (
        <ToastCtx.Provider value={{ toast, success, error, warning, info }}>
            {children}

            {/* Toast container — fixed bottom-right */}
            <div
                aria-live="polite"
                aria-atomic="false"
                style={{
                    position: 'fixed',
                    bottom: '1.5rem',
                    right: '1.5rem',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '.625rem',
                    pointerEvents: 'none',
                }}
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        role="alert"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '.625rem',
                            minWidth: '260px',
                            maxWidth: '400px',
                            padding: '.75rem 1rem',
                            borderRadius: '8px',
                            background: BG[t.variant],
                            border: `1px solid ${BORDER[t.variant]}`,
                            color: '#f1f5f9',
                            fontSize: '.875rem',
                            boxShadow: '0 4px 24px rgba(0,0,0,.45)',
                            pointerEvents: 'auto',
                            animation: 'toast-in .18s ease',
                        }}
                    >
                        <span
                            style={{
                                width: '1.25rem',
                                height: '1.25rem',
                                borderRadius: '50%',
                                border: `1.5px solid ${BORDER[t.variant]}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                fontSize: '.7rem',
                                fontWeight: 700,
                            }}
                        >
                            {ICONS[t.variant]}
                        </span>
                        <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
                        <button
                            type="button"
                            onClick={() => dismiss(t.id)}
                            aria-label="Dismiss"
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                lineHeight: 1,
                                padding: '0 .125rem',
                                flexShrink: 0,
                            }}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            <style>{`@keyframes toast-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }`}</style>
        </ToastCtx.Provider>
    )
}
