import type { ReactNode } from 'react'

import { Icon } from '@/components/ui/Icon'
import { cn } from '@/utils/cn'

export interface MetricCardProps {
  label: string
  value: ReactNode
  icon: string
  tone?: 'default' | 'danger'
  footer?: ReactNode
}

export function MetricCard({ label, value, icon, tone = 'default', footer }: MetricCardProps) {
  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-lowest p-space-md shadow-sm transition-shadow hover:shadow-md">
      {tone === 'danger' && <div className="absolute top-0 right-0 left-0 h-1 bg-error" />}
      <div className="flex items-start justify-between">
        <span className={cn('text-label-sm tracking-wider uppercase', tone === 'danger' ? 'font-bold text-error' : 'text-secondary')}>
          {label}
        </span>
        <Icon name={icon} size={20} className={tone === 'danger' ? 'text-error' : 'text-primary'} />
      </div>
      <div className="my-space-sm">
        <div className={cn('text-display-lg leading-none', tone === 'danger' ? 'text-error' : 'text-on-surface')}>{value}</div>
      </div>
      {footer && <div className="flex items-center justify-between pt-space-xs">{footer}</div>}
    </div>
  )
}
