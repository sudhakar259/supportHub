import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { SlaCountdown } from '@/features/tickets/components/SlaCountdown'
import type { Ticket } from '@/types/ticket'

export interface TicketCardProps {
  ticket: Ticket
}

/** Urgent-ticket card used on the Operations Center dashboard's SLA warnings desk. */
export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <Link
      to={ROUTES.ticketDetails(ticket.id)}
      className="flex flex-col gap-space-xs rounded-lg bg-surface-container-low p-space-md transition-colors hover:bg-surface-container"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-code-sm font-bold text-primary">{ticket.ticketNumber}</span>
          <PriorityBadge priority={ticket.priority} />
          {ticket.category && (
            <span className="rounded bg-surface-container px-2 py-0.5 text-secondary text-label-sm">{ticket.category.name}</span>
          )}
        </div>
        <SlaCountdown sla={ticket.sla} />
      </div>
      <h3 className="text-title-sm font-semibold text-on-surface">{ticket.subject}</h3>
      <div className="flex items-center justify-between pt-1 text-body-sm text-secondary">
        <div className="flex items-center gap-space-md">
          {ticket.customer?.companyName && (
            <span className="flex items-center gap-1 text-on-surface">
              <Icon name="apartment" size={16} className="text-secondary" />
              {ticket.customer.companyName}
            </span>
          )}
        </div>
        {ticket.assignee ? (
          <div className="flex items-center gap-2">
            <span className="text-label-sm text-secondary">Assignee:</span>
            <div className="flex items-center gap-1 text-title-sm text-on-surface">
              <Avatar name={ticket.assignee.name} src={ticket.assignee.avatarPath} size={20} />
              <span>{ticket.assignee.name}</span>
            </div>
          </div>
        ) : (
          <span className="rounded bg-error/10 px-2 py-0.5 font-bold text-error text-label-sm">UNASSIGNED</span>
        )}
      </div>
    </Link>
  )
}
