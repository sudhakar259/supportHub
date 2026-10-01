import type { ReactNode } from 'react'

import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/utils/cn'

export type AlertTone = 'error' | 'success' | 'info'

const toneConfig: Record<AlertTone, { container: string; icon: string; iconColor: string }> = {
  error: { container: 'bg-error-container text-on-error-container', icon: 'error', iconColor: 'text-error' },
  success: { container: 'bg-surface-container text-on-surface', icon: 'verified_user', iconColor: 'text-tertiary' },
  info: { container: 'bg-surface-container-low text-on-surface', icon: 'info', iconColor: 'text-primary' },
}

export interface InlineAlertProps {
  tone: AlertTone
  title: string
  description?: ReactNode
  onDismiss?: () => void
  className?: string
}

/** Dismissible banner for form-level success/error/info feedback. */
export function InlineAlert({ tone, title, description, onDismiss, className }: InlineAlertProps) {
  const config = toneConfig[tone]

  return (
    <div className={cn('flex items-start gap-space-md rounded-lg p-space-md shadow-sm', config.container, className)}>
      <Icon name={config.icon} size={20} filled className={cn('mt-0.5', config.iconColor)} />
      <div className="flex-1">
        <div className="text-title-sm font-semibold">{title}</div>
        {description && <div className="text-body-sm mt-0.5 opacity-90">{description}</div>}
      </div>
      {onDismiss && <IconButton icon="close" label="Dismiss" size={16} onClick={onDismiss} className="opacity-70" />}
    </div>
  )
}
