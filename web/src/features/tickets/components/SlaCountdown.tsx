import { useEffect, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { formatCountdown } from '@/utils/datetime'
import { cn } from '@/utils/cn'
import type { TicketSla } from '@/types/ticket'

export interface SlaCountdownProps {
  sla: TicketSla | null
}

const DANGER_THRESHOLD_MS = 30 * 60 * 1000
const WARNING_THRESHOLD_MS = 2 * 60 * 60 * 1000

/** Live countdown chip for a ticket's SLA target, color-coded by urgency. Re-renders every 30s. */
export function SlaCountdown({ sla }: SlaCountdownProps) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  if (!sla) return null

  if (sla.status === 'breached') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-error-container px-2 py-1 text-code-sm font-bold text-error">
        <Icon name="warning" size={14} />
        Breached
      </span>
    )
  }

  if (sla.status === 'met') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-tertiary-fixed/30 px-2 py-1 text-code-sm text-on-tertiary-fixed">
        <Icon name="check" size={14} />
        SLA Met
      </span>
    )
  }

  const target = sla.firstResponseMetAt ? sla.resolutionDueAt : (sla.firstResponseDueAt ?? sla.resolutionDueAt)
  if (!target) return null

  const remainingMs = new Date(target).getTime() - now.getTime()
  const tone =
    remainingMs <= DANGER_THRESHOLD_MS ? 'danger' : remainingMs <= WARNING_THRESHOLD_MS ? 'warning' : 'healthy'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-1 text-code-sm font-bold',
        tone === 'danger' && 'bg-error-container text-error',
        tone === 'warning' && 'bg-primary-fixed/60 text-primary-container',
        tone === 'healthy' && 'bg-surface-container-high text-on-surface',
      )}
    >
      <Icon name={tone === 'healthy' ? 'schedule' : 'alarm'} size={14} />
      {formatCountdown(target, now)} {remainingMs > 0 ? 'remaining' : ''}
    </span>
  )
}
