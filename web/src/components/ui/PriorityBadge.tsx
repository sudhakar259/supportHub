import type { StatusLike } from '@/components/ui/StatusBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'

export interface PriorityBadgeProps {
  priority: StatusLike | null | undefined
}

/** Same rendering as StatusBadge — named separately so call sites read as `<PriorityBadge priority={...} />`. */
export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return <StatusBadge status={priority} pulse={priority?.name.toLowerCase().includes('critical')} />
}
