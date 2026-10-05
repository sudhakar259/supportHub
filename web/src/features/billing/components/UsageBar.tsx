import { Icon } from '@/components/ui/Icon'
import type { UsageMetric } from '@/features/billing/types'
import { cn } from '@/utils/cn'

export interface UsageBarProps {
  icon: string
  label: string
  metric: UsageMetric
}

export function UsageBar({ icon, label, metric }: UsageBarProps) {
  const limit = metric.limit
  const percent = limit === null ? 0 : Math.min(100, Math.round((metric.used / Math.max(limit, 1)) * 100))
  const isNearLimit = limit !== null && percent >= 90

  return (
    <div className="flex flex-col gap-space-xs rounded-lg bg-surface-container-low p-space-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs text-title-sm text-on-surface">
          <Icon name={icon} size={18} className="text-secondary" />
          {label}
        </div>
        <span className="font-code-sm text-code-sm text-secondary">
          {metric.used.toLocaleString()} {limit === null ? '' : `/ ${limit.toLocaleString()}`}
          {limit === null && <span className="ml-1 text-tertiary">Unlimited</span>}
        </span>
      </div>
      {limit !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high">
          <div
            className={cn('h-full rounded-full transition-all', isNearLimit ? 'bg-error' : 'bg-primary')}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  )
}
