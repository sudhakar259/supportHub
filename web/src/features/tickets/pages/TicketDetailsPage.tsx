import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { ActivityTimeline, deriveTicketTimeline } from '@/features/tickets/components/ActivityTimeline'
import { AssignmentDialog } from '@/features/tickets/components/AssignmentDialog'
import { CustomerProfilePanel } from '@/features/tickets/components/CustomerProfilePanel'
import { ReplyComposer } from '@/features/tickets/components/ReplyComposer'
import { StatusActionDialog } from '@/features/tickets/components/StatusActionDialog'
import { TicketOriginalRequest } from '@/features/tickets/components/TicketOriginalRequest'
import { TicketConversation } from '@/features/tickets/components/TicketConversation'
import { TicketHeader } from '@/features/tickets/components/TicketHeader'
import { TicketPropertiesPanel } from '@/features/tickets/components/TicketPropertiesPanel'
import { ticketsApi } from '@/features/tickets/api/ticketsApi'
import { useTicket } from '@/features/tickets/hooks/useTicket'
import { useTicketMessages } from '@/features/tickets/hooks/useTicketMessages'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { hasPermission } from '@/types/user'

type DialogKind = 'assign' | 'escalate' | 'resolve' | 'close' | 'reopen' | null

export function TicketDetailsPage() {
  const { ticketId } = useParams<{ ticketId: string }>()
  const { user } = useAuth()
  const { ticket, setTicket, isLoading, error, refetch } = useTicket(ticketId)
  const { messages, isLoading: messagesLoading, error: messagesError, refetch: refetchMessages, postMessage, isPosting } =
    useTicketMessages(ticketId)
  const [openDialog, setOpenDialog] = useState<DialogKind>(null)

  if (isLoading) return <LoadingState label="Loading ticket…" />
  if (error || !ticket) return <ErrorState description={error?.message ?? 'Ticket not found.'} onRetry={refetch} />

  const canPostInternalNotes = hasPermission(user, 'tickets.view_internal_notes')

  return (
    <div className="flex flex-col gap-space-md">
      <TicketHeader
        ticket={ticket}
        onAssign={() => setOpenDialog('assign')}
        onEscalate={() => setOpenDialog('escalate')}
        onResolve={() => setOpenDialog('resolve')}
        onClose={() => setOpenDialog('close')}
        onReopen={() => setOpenDialog('reopen')}
      />

      <div className="grid grid-cols-12 items-start gap-gutter px-gutter-lg py-space-md">
        <div className="col-span-12 flex flex-col gap-space-md xl:col-span-8">
          <TicketOriginalRequest ticket={ticket} />
          <TicketConversation messages={messages} isLoading={messagesLoading} error={messagesError} onRetry={refetchMessages} />
          <ReplyComposer
            recipientEmail={ticket.customer?.user?.email}
            isSubmitting={isPosting}
            canPostInternalNotes={canPostInternalNotes}
            isTicketClosed={ticket.status?.isClosed ?? false}
            onSubmit={postMessage}
          />
        </div>

        <aside className="col-span-12 flex flex-col gap-space-md xl:col-span-4">
          <CustomerProfilePanel customer={ticket.customer} />
          <TicketPropertiesPanel ticket={ticket} onReassign={() => setOpenDialog('assign')} />
          <ActivityTimeline events={deriveTicketTimeline(ticket)} />
        </aside>
      </div>

      <AssignmentDialog
        isOpen={openDialog === 'assign'}
        onClose={() => setOpenDialog(null)}
        currentAssigneeId={ticket.assignee?.id}
        currentDepartmentId={ticket.department?.id}
        onAssign={async (payload) => {
          const updated = await ticketsApi.assign(ticket.id, payload)
          setTicket(updated)
        }}
      />

      <StatusActionDialog
        isOpen={openDialog === 'escalate'}
        onClose={() => setOpenDialog(null)}
        title="Escalate Ticket"
        description="Escalating raises urgency and notifies the next tier. This cannot be undone automatically."
        confirmLabel="Escalate"
        confirmVariant="secondary"
        confirmIcon="bolt"
        successMessage="Ticket escalated."
        onConfirm={async (reason) => setTicket(await ticketsApi.escalate(ticket.id, { reason }))}
      />

      <StatusActionDialog
        isOpen={openDialog === 'resolve'}
        onClose={() => setOpenDialog(null)}
        title="Resolve Ticket"
        description="Mark this ticket as resolved. The requester can still reopen it if the issue returns."
        confirmLabel="Resolve"
        confirmIcon="task_alt"
        successMessage="Ticket resolved."
        onConfirm={async (reason) => setTicket(await ticketsApi.resolve(ticket.id, { reason }))}
      />

      <StatusActionDialog
        isOpen={openDialog === 'close'}
        onClose={() => setOpenDialog(null)}
        title="Close Ticket"
        description="Closing this ticket archives it. It can still be reopened later if needed."
        confirmLabel="Close Ticket"
        confirmIcon="cancel"
        successMessage="Ticket closed."
        onConfirm={async (reason) => setTicket(await ticketsApi.close(ticket.id, { reason }))}
      />

      <StatusActionDialog
        isOpen={openDialog === 'reopen'}
        onClose={() => setOpenDialog(null)}
        title="Reopen Ticket"
        description="Reopening returns this ticket to an active queue for further work."
        confirmLabel="Reopen"
        confirmIcon="replay"
        successMessage="Ticket reopened."
        onConfirm={async (reason) => setTicket(await ticketsApi.reopen(ticket.id, { reason }))}
      />
    </div>
  )
}
