import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { TicketMessageItem } from '@/features/tickets/components/TicketMessageItem'
import type { TicketMessage } from '@/types/ticket'

export interface TicketConversationProps {
  messages: TicketMessage[]
  isLoading: boolean
  error: Error | null
  onRetry: () => void
}

export function TicketConversation({ messages, isLoading, error, onRetry }: TicketConversationProps) {
  if (isLoading) return <LoadingState label="Loading conversation…" />
  if (error) return <ErrorState description={error.message} onRetry={onRetry} />
  if (messages.length === 0) return <EmptyState icon="forum" title="No messages yet" description="Be the first to reply." />

  return (
    <div className="flex flex-col gap-space-md">
      {messages.map((message) => (
        <TicketMessageItem key={message.id} message={message} />
      ))}
    </div>
  )
}
