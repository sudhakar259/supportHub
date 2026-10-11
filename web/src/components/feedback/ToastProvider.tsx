import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { ToastCard } from '@/components/feedback/ToastCard'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastInput {
  title: string
  message?: string
  variant?: ToastVariant
  actions?: ToastAction[]
  /** Auto-dismiss delay in ms. Pass 0 to require manual dismissal. Defaults: error=0 (sticky), others=5000. */
  duration?: number
}

export interface ToastRecord extends ToastInput {
  id: string
  variant: ToastVariant
}

type ShowOptions = Omit<ToastInput, 'title' | 'message' | 'variant'>

interface ToastContextValue {
  show: (toast: ToastInput) => string
  success: (title: string, message?: string, options?: ShowOptions) => string
  error: (title: string, message?: string, options?: ShowOptions) => string
  warning: (title: string, message?: string, options?: ShowOptions) => string
  info: (title: string, message?: string, options?: ShowOptions) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 5000,
  info: 5000,
  warning: 6000,
  error: 0,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((toast: ToastInput) => {
    const id = crypto.randomUUID()
    const variant = toast.variant ?? 'info'
    const duration = toast.duration ?? DEFAULT_DURATION[variant]
    setToasts((prev) => [...prev, { ...toast, id, variant, duration }])
    return id
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (title, message, options) => show({ ...options, title, message, variant: 'success' }),
      error: (title, message, options) => show({ ...options, title, message, variant: 'error' }),
      warning: (title, message, options) => show({ ...options, title, message, variant: 'warning' }),
      info: (title, message, options) => show({ ...options, title, message, variant: 'info' }),
      dismiss,
    }),
    [show, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div
          className="pointer-events-none fixed top-gutter right-gutter z-[100] flex w-full max-w-sm flex-col gap-space-sm"
          aria-live="polite"
          aria-atomic="false"
        >
          {toasts.map((toast) => (
            <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}
