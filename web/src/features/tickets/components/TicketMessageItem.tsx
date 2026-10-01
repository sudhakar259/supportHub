import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { formatRelativeTime } from '@/utils/datetime'
import type { TicketMessage } from '@/types/ticket'

export interface TicketMessageItemProps {
  message: TicketMessage
}

export function TicketMessageItem({ message }: TicketMessageItemProps) {
  const authorName = message.author?.name ?? 'Unknown'
  const isInternal = message.type === 'internal_note'
  const isCustomer = message.type === 'customer_message'

  return (
    <article
      className={
        isInternal
          ? 'relative flex flex-col gap-space-sm overflow-hidden rounded bg-surface-container-high/40 p-space-md shadow-sm'
          : 'flex flex-col gap-space-sm rounded bg-surface-container-lowest p-space-md shadow-sm'
      }
    >
      {isInternal && (
        <>
          <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-primary-container" />
          <div className="flex items-center justify-between rounded bg-primary-fixed/60 px-space-sm py-1">
            <div className="flex items-center gap-1.5 text-label-sm font-bold tracking-wider text-on-primary-fixed uppercase">
              <Icon name="lock" size={16} />
              <span>Internal Note — Hidden from Requester</span>
            </div>
          </div>
        </>
      )}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <Avatar name={authorName} src={message.author?.avatarPath} size={36} />
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-title-sm font-bold text-on-surface">{authorName}</span>
              <span className="rounded bg-surface-container px-1.5 py-0.2 text-label-sm text-secondary">
                {isCustomer ? 'Customer' : message.author?.roles[0] || 'Staff'}
              </span>
            </div>
            <span className="text-body-sm text-secondary">{formatRelativeTime(message.createdAt)}</span>
          </div>
        </div>
      </header>
      <div className="flex flex-col gap-2 text-body-md text-on-surface whitespace-pre-wrap">{message.body}</div>
      {message.attachments.length > 0 && (
        <footer className="flex flex-wrap items-center gap-2 pt-2">
          {message.attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={attachment.downloadUrl}
              className="inline-flex items-center gap-1.5 rounded bg-surface-container px-2.5 py-1 text-code-sm text-on-surface transition-colors hover:bg-surface-container-high"
            >
              <Icon name="description" size={16} className="text-primary" />
              <span>{attachment.originalFilename}</span>
            </a>
          ))}
        </footer>
      )}
    </article>
  )
}
