import { Avatar } from '@/components/ui/Avatar'
import { AttachmentLink } from '@/features/tickets/components/AttachmentLink'
import { formatRelativeTime } from '@/utils/datetime'
import type { Ticket } from '@/types/ticket'

/**
 * The request as the customer first wrote it: the ticket's description and any
 * files attached when it was created. The conversation below only lists
 * replies, so without this card neither is visible anywhere on the page.
 */
export function TicketOriginalRequest({ ticket }: { ticket: Ticket }) {
  const requester = ticket.customer?.user
  const hasContent = ticket.description.trim() !== '' || ticket.attachments.length > 0

  if (!hasContent) return null

  return (
    <article className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <header className="flex items-center gap-2.5">
        <Avatar name={requester?.name ?? 'Customer'} src={requester?.avatarPath} size={32} />
        <div className="flex flex-col">
          <span className="text-title-sm font-semibold">{requester?.name ?? 'Customer'}</span>
          <span className="text-body-sm text-secondary">Original request · {formatRelativeTime(ticket.createdAt)}</span>
        </div>
      </header>
      {ticket.description.trim() !== '' && (
        <div className="text-body-md text-on-surface whitespace-pre-wrap">{ticket.description}</div>
      )}
      {ticket.attachments.length > 0 && (
        <footer className="flex flex-wrap items-center gap-2 pt-2">
          {ticket.attachments.map((attachment) => (
            <AttachmentLink key={attachment.id} attachment={attachment} icon="attach_file" />
          ))}
        </footer>
      )}
    </article>
  )
}
