import { hexToRgba } from '@/utils/color'

export interface StatusLike {
  name: string
  color: string
}

export interface StatusBadgeProps {
  status: StatusLike | null | undefined
  /** Shows a pulsing dot — used for urgent states like "Escalated". */
  pulse?: boolean
}

/**
 * Renders a ticket status/priority as a colored pill using the color stored on
 * the record itself (statuses and priorities are DB-driven, not a fixed enum —
 * see TicketStatus/TicketPriority models), not a hardcoded palette.
 */
export function StatusBadge({ status, pulse = false }: StatusBadgeProps) {
  if (!status) return null

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-sm font-bold uppercase tracking-wider"
      style={{ backgroundColor: hexToRgba(status.color, 0.14), color: 'var(--color-on-surface)' }}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
            style={{ backgroundColor: status.color }}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
        </span>
      )}
      {!pulse && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: status.color }} />}
      {status.name}
    </span>
  )
}
