import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { SlaCountdown } from '@/features/tickets/components/SlaCountdown'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { hasPermission } from '@/types/user'
import { formatRelativeTime } from '@/utils/datetime'
import type { Ticket } from '@/types/ticket'

export interface TicketHeaderProps {
  ticket: Ticket
  onAssign: () => void
  onEscalate: () => void
  onResolve: () => void
  onClose: () => void
  onReopen: () => void
}

// QA finding, 2026-10-01: these buttons were previously gated only by
// ticket.status.isClosed, never by permission — every signed-in user who
// could open a ticket's detail page saw every lifecycle action regardless
// of role. The backend's TicketPolicy was always the real gate; this just
// stops the UI from inviting an action the API will reject.
export function TicketHeader({ ticket, onAssign, onEscalate, onResolve, onClose, onReopen }: TicketHeaderProps) {
  const { user } = useAuth()
  const isClosed = ticket.status?.isClosed ?? false
  const isOwningCustomer = ticket.customer?.user?.id !== undefined && ticket.customer.user.id === user?.id
  const canAssign = hasPermission(user, 'tickets.assign')
  const canEscalate = hasPermission(user, 'tickets.escalate')
  const canResolve = hasPermission(user, 'tickets.resolve')
  const canClose = hasPermission(user, 'tickets.close')
  const canReopen = isOwningCustomer || hasPermission(user, 'tickets.reopen')

  return (
    <section className="bg-surface-container-lowest px-gutter-lg py-space-md shadow-sm">
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-2 text-label-sm text-secondary uppercase tracking-wider">
          <span>Workspace</span>
          <Icon name="chevron_right" size={14} />
          <span>Tickets</span>
          <Icon name="chevron_right" size={14} />
          <span className="rounded bg-surface-container px-1.5 py-0.5 font-semibold text-primary">{ticket.ticketNumber}</span>
        </nav>
        <div className="flex items-center gap-space-md text-label-sm text-secondary">
          <SlaCountdown sla={ticket.sla} />
          <span>Created {formatRelativeTime(ticket.createdAt)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-space-md pt-1">
        <div className="flex flex-wrap items-center gap-space-md">
          <h1 className="text-headline-md tracking-tight text-on-surface">{ticket.subject}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {ticket.status && (
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-label-sm font-bold tracking-wider uppercase"
                style={{ backgroundColor: ticket.status.color, color: '#fff' }}
              >
                {ticket.status.name}
              </span>
            )}
            <PriorityBadge priority={ticket.priority} />
            {ticket.department && (
              <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-label-sm font-semibold text-on-surface">
                {ticket.department.name}
              </span>
            )}
            {ticket.assignee && (
              <div className="flex items-center gap-1.5 rounded-full bg-surface-container px-2.5 py-0.5">
                <Avatar name={ticket.assignee.name} src={ticket.assignee.avatarPath} size={18} />
                <span className="text-title-sm font-bold text-on-surface">{ticket.assignee.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canAssign && (
            <Button variant="ghost" size="sm" leadingIcon="person_add" onClick={onAssign}>
              {ticket.assignee ? 'Reassign' : 'Assign'}
            </Button>
          )}
          {!isClosed && (
            <>
              {canEscalate && (
                <Button variant="secondary" size="sm" leadingIcon="bolt" onClick={onEscalate}>
                  Escalate
                </Button>
              )}
              {canResolve && (
                <Button size="sm" leadingIcon="task_alt" onClick={onResolve}>
                  Resolve
                </Button>
              )}
              {canClose && (
                <Button variant="ghost" size="sm" leadingIcon="cancel" onClick={onClose}>
                  Close
                </Button>
              )}
            </>
          )}
          {isClosed && canReopen && (
            <Button variant="ghost" size="sm" leadingIcon="replay" onClick={onReopen}>
              Reopen
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
