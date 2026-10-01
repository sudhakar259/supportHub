import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { Icon } from '@/components/ui/Icon'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { formatRelativeTime } from '@/utils/datetime'
import type { Ticket } from '@/types/ticket'

const STATUS_ICON: Record<string, string> = {
  open: 'folder_open',
  'in-progress': 'rotate_right',
  pending: 'schedule',
  'awaiting-response': 'mark_email_unread',
  escalated: 'crisis_alert',
  resolved: 'check_circle',
  closed: 'archive',
  reopened: 'replay',
}

export interface TicketRowProps {
  ticket: Ticket
}

/** Compact ticket row used in the dashboard's "Recent" panel and similar condensed lists. */
export function TicketRow({ ticket }: TicketRowProps) {
  const icon = ticket.status ? (STATUS_ICON[ticket.status.slug] ?? 'description') : 'description'

  return (
    <Link
      to={ROUTES.ticketDetails(ticket.id)}
      className="flex cursor-pointer flex-col gap-1 rounded-lg p-space-sm transition-colors hover:bg-surface-container-low"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-code-sm text-secondary">{ticket.ticketNumber}</span>
          <PriorityBadge priority={ticket.priority} />
          {ticket.customer?.companyName && <span className="text-label-sm text-secondary">{ticket.customer.companyName}</span>}
        </div>
        <span className="text-label-sm text-secondary">{formatRelativeTime(ticket.createdAt)}</span>
      </div>
      <div className="truncate text-title-sm font-medium text-on-surface">{ticket.subject}</div>
      {ticket.status && (
        <div className="flex items-center gap-2 text-label-sm text-secondary">
          <span className="flex items-center gap-1" style={{ color: ticket.status.color }}>
            <Icon name={icon} size={14} />
            {ticket.status.name}
          </span>
        </div>
      )}
    </Link>
  )
}
