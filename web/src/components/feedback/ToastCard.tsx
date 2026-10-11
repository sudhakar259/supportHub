import { useEffect, useRef, useState } from 'react'

import { IconButton } from '@/components/ui/IconButton'
import { Icon } from '@/components/ui/Icon'
import type { ToastRecord, ToastVariant } from '@/components/feedback/ToastProvider'
import { cn } from '@/utils/cn'

const VARIANT_STYLES: Record<ToastVariant, { icon: string; border: string; iconColor: string }> = {
  success: { icon: 'check_circle', border: 'border-l-success', iconColor: 'text-success' },
  error: { icon: 'error', border: 'border-l-error', iconColor: 'text-error' },
  warning: { icon: 'warning', border: 'border-l-warning', iconColor: 'text-warning' },
  info: { icon: 'info', border: 'border-l-info', iconColor: 'text-info' },
}

export interface ToastCardProps {
  toast: ToastRecord
  onDismiss: () => void
}

/** A single enterprise toast card — see the reusable-states design file's "04 // TOAST & DIALOG" anatomy. */
export function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (!toast.duration) return
    timeoutRef.current = setTimeout(() => handleDismiss(), toast.duration)
    return () => clearTimeout(timeoutRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.duration])

  function handleDismiss() {
    setIsVisible(false)
    setTimeout(onDismiss, 200)
  }

  const { icon, border, iconColor } = VARIANT_STYLES[toast.variant]

  return (
    <div
      role={toast.variant === 'error' || toast.variant === 'warning' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex items-start gap-space-sm rounded-lg border-l-4 bg-surface-container-lowest p-space-md shadow-lg transition-all duration-200 ease-out',
        border,
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0',
      )}
    >
      <Icon name={icon} size={22} className={cn('mt-0.5 shrink-0', iconColor)} />
      <div className="min-w-0 flex-1">
        <h4 className="text-title-sm text-on-surface">{toast.title}</h4>
        {toast.message && <p className="mt-0.5 text-body-sm text-secondary">{toast.message}</p>}
        {toast.actions && toast.actions.length > 0 && (
          <div className="mt-space-sm flex items-center gap-space-md">
            {toast.actions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="text-label-md text-primary hover:underline"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <IconButton icon="close" label="Dismiss notification" size={16} onClick={handleDismiss} className="-m-1 shrink-0" />
    </div>
  )
}
