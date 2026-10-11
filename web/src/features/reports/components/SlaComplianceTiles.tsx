import { Icon } from '@/components/ui/Icon'
import { cn } from '@/utils/cn'
import type { SlaComplianceReport } from '@/types/report'

function toneFor(rate: number): 'healthy' | 'warning' | 'danger' {
  if (rate <= 5) return 'healthy'
  if (rate <= 15) return 'warning'
  return 'danger'
}

const TONE_CLASSES: Record<string, { text: string; bar: string; icon: string }> = {
  healthy: { text: 'text-tertiary', bar: 'bg-tertiary', icon: 'check_circle' },
  warning: { text: 'text-warning', bar: 'bg-warning', icon: 'warning' },
  danger: { text: 'text-error', bar: 'bg-error', icon: 'crisis_alert' },
}

function ComplianceTile({ label, rate, breached, total }: { label: string; rate: number; breached: number; total: number }) {
  const tone = toneFor(rate)
  const classes = TONE_CLASSES[tone]

  return (
    <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-label-sm uppercase tracking-wider text-secondary">{label}</span>
        <Icon name={classes.icon} size={20} className={classes.text} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn('text-display-lg', classes.text)}>{rate}%</span>
        <span className="text-body-sm text-on-surface-variant">breach rate</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
        <div className={cn('h-full rounded-full', classes.bar)} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <span className="text-body-sm text-on-surface-variant">
        {breached} of {total} breached
      </span>
    </div>
  )
}

export function SlaComplianceTiles({ report }: { report: SlaComplianceReport }) {
  return (
    <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
      <ComplianceTile
        label="First Response"
        rate={report.firstResponseBreachRate}
        breached={report.firstResponseBreached}
        total={report.totalWithSla}
      />
      <ComplianceTile
        label="Resolution"
        rate={report.resolutionBreachRate}
        breached={report.resolutionBreached}
        total={report.totalWithSla}
      />
    </div>
  )
}
