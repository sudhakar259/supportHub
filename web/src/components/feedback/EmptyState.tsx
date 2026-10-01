import type { ReactNode } from 'react'

import { Icon } from '@/components/ui/Icon'

export interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-space-sm py-space-xl text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-secondary">
        <Icon name={icon} size={24} />
      </div>
      <p className="text-title-sm text-on-surface">{title}</p>
      {description && <p className="text-body-sm text-on-surface-variant max-w-sm">{description}</p>}
      {action}
    </div>
  )
}
