import { Icon } from '@/components/ui/Icon'
import { formatDateTime } from '@/utils/datetime'
import type { Ticket } from '@/types/ticket'

export interface TimelineEvent {
  id: string
  title: string
  description?: string
  timestamp: string
  dotClassName?: string
}

export interface ActivityTimelineProps {
  events: TimelineEvent[]
}

/**
 * Derives a timeline from the fields available on a Ticket. There is no
 * dedicated ticket-activity/history endpoint yet (TicketStatusHistory exists
 * as a model but isn't exposed via the API), so this reconstructs the
 * milestones we can actually observe rather than fabricating a richer feed.
 */
export function deriveTicketTimeline(ticket: Ticket): TimelineEvent[] {
  const events: TimelineEvent[] = []

  if (ticket.closedAt) {
    events.push({ id: 'closed', title: 'Ticket closed', timestamp: ticket.closedAt, dotClassName: 'bg-surface-container-high' })
  }
  if (ticket.resolvedAt) {
    events.push({ id: 'resolved', title: 'Ticket resolved', timestamp: ticket.resolvedAt, dotClassName: 'bg-tertiary' })
  }
  if (ticket.firstResponseAt) {
    events.push({
      id: 'first-response',
      title: 'First response sent',
      timestamp: ticket.firstResponseAt,
      dotClassName: 'bg-primary',
    })
  }
  if (ticket.assignee) {
    events.push({
      id: 'assigned',
      title: `Assigned to ${ticket.assignee.name}`,
      timestamp: ticket.updatedAt,
      dotClassName: 'bg-secondary',
    })
  }
  events.push({
    id: 'created',
    title: 'Ticket created',
    description: ticket.department ? `Routed to ${ticket.department.name}` : undefined,
    timestamp: ticket.createdAt,
    dotClassName: 'bg-tertiary',
  })

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  return (
    <section className="flex flex-col gap-space-sm rounded bg-surface-container-lowest p-space-md shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon name="history" size={18} className="text-secondary" />
          <span className="text-label-sm font-bold text-secondary uppercase tracking-wider">Activity Timeline</span>
        </div>
        <span className="text-label-sm text-secondary">{events.length} events</span>
      </div>
      <div className="relative flex flex-col gap-space-md pt-2 pl-6">
        <div className="absolute top-3 bottom-2 left-2.5 w-0.5 bg-surface-container-high" />
        {events.map((event) => (
          <div key={event.id} className="relative flex items-start gap-2">
            <div className={`absolute top-1 -left-6 h-3.5 w-3.5 rounded-full ${event.dotClassName ?? 'bg-secondary'}`} />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-title-sm font-bold text-on-surface">{event.title}</span>
                <span className="text-label-sm text-secondary">{formatDateTime(event.timestamp)}</span>
              </div>
              {event.description && <span className="text-body-sm text-secondary">{event.description}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
