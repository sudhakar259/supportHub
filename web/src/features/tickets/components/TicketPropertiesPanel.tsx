import { Avatar } from '@/components/ui/Avatar'
import { IconButton } from '@/components/ui/IconButton'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { SlaCountdown } from '@/features/tickets/components/SlaCountdown'
import type { Ticket } from '@/types/ticket'

export interface TicketPropertiesPanelProps {
  ticket: Ticket
  onReassign: () => void
}

export function TicketPropertiesPanel({ ticket, onReassign }: TicketPropertiesPanelProps) {
  return (
    <section className="flex flex-col gap-space-sm rounded bg-surface-container-lowest p-space-md shadow-sm">
      <span className="text-label-sm font-bold text-secondary uppercase tracking-wider">Ticket Properties</span>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between py-1">
          <span className="text-body-sm text-secondary">Assignee</span>
          {ticket.assignee ? (
            <div className="flex items-center gap-1.5">
              <Avatar name={ticket.assignee.name} size={20} src={ticket.assignee.avatarPath} />
              <span className="text-title-sm font-semibold text-on-surface">{ticket.assignee.name}</span>
              <IconButton icon="swap_horiz" label="Reassign" size={16} onClick={onReassign} />
            </div>
          ) : (
            <IconButton icon="person_add" label="Assign" size={16} onClick={onReassign} />
          )}
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-body-sm text-secondary">Priority</span>
          <PriorityBadge priority={ticket.priority} />
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-body-sm text-secondary">Department</span>
          <span className="text-title-sm font-semibold text-on-surface">{ticket.department?.name ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-body-sm text-secondary">Category</span>
          <span className="text-body-sm font-medium text-on-surface">{ticket.category?.name ?? '—'}</span>
        </div>
        {ticket.sla && (
          <div className="flex items-center justify-between py-1">
            <span className="text-body-sm text-secondary">SLA</span>
            <SlaCountdown sla={ticket.sla} />
          </div>
        )}
        {ticket.tags.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-2">
            <span className="text-label-sm text-secondary uppercase">Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {ticket.tags.map((tag) => (
                <span key={tag} className="rounded bg-surface-container px-2 py-0.5 text-code-sm text-on-surface">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
