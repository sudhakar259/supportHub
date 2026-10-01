import { useEffect, useState } from 'react'

import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { prioritiesApi } from '@/features/tickets/api/prioritiesApi'
import { statusesApi } from '@/features/tickets/api/statusesApi'
import { PriorityFormModal } from '@/features/tickets/components/PriorityFormModal'
import { StatusFormModal } from '@/features/tickets/components/StatusFormModal'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { hasPermission } from '@/types/user'
import type { TicketPriority, TicketStatus } from '@/types/ticket'

export function TicketConfigPage() {
  const { user } = useAuth()
  const canCreateStatus = hasPermission(user, 'statuses.create')
  const canUpdateStatus = hasPermission(user, 'statuses.update')
  const canDeleteStatus = hasPermission(user, 'statuses.delete')
  const canCreatePriority = hasPermission(user, 'priorities.create')
  const canUpdatePriority = hasPermission(user, 'priorities.update')
  const canDeletePriority = hasPermission(user, 'priorities.delete')
  const [statuses, setStatuses] = useState<TicketStatus[]>([])
  const [priorities, setPriorities] = useState<TicketPriority[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const [statusForm, setStatusForm] = useState<{ status: TicketStatus | null } | null>(null)
  const [priorityForm, setPriorityForm] = useState<{ priority: TicketPriority | null } | null>(null)
  const [deletingStatus, setDeletingStatus] = useState<TicketStatus | null>(null)
  const [deletingPriority, setDeletingPriority] = useState<TicketPriority | null>(null)

  useEffect(() => {
    setIsLoading(true)
    Promise.all([statusesApi.list(), prioritiesApi.list()])
      .then(([s, p]) => {
        setStatuses(s)
        setPriorities(p)
      })
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false))
  }, [reloadToken])

  const refetch = () => setReloadToken((t) => t + 1)

  if (isLoading) return <LoadingState label="Loading configuration…" />
  if (error) return <ErrorState description={error.message} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader breadcrumbs={[{ label: 'Workspace' }, { label: 'Governance' }, { label: 'Statuses & Priorities' }]} title="Statuses & Priorities" />

      <div className="grid grid-cols-1 gap-space-lg px-gutter-lg xl:grid-cols-2">
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <div className="mb-space-sm flex items-center justify-between">
            <span className="text-title-md font-bold text-on-surface">Ticket Statuses</span>
            {canCreateStatus && (
              <button
                type="button"
                onClick={() => setStatusForm({ status: null })}
                className="flex items-center gap-1 rounded-lg bg-surface-container px-2.5 py-1.5 text-label-sm font-semibold text-on-surface hover:bg-surface-container-high"
              >
                <Icon name="add" size={16} />
                Add Status
              </button>
            )}
          </div>
          <div className="flex flex-col divide-y divide-surface-container-low">
            {statuses.map((status) => (
              <div key={status.id} className="flex items-center justify-between py-space-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: status.color }} />
                  <span className="text-title-sm font-semibold text-on-surface">{status.name}</span>
                  <span className="font-code-sm text-code-sm text-secondary">{status.slug}</span>
                  {status.isDefault && <Badge tone="secondary">Default</Badge>}
                  {status.isClosed && <Badge tone="neutral">Closed</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  {canUpdateStatus && <IconButton icon="edit" label="Edit status" onClick={() => setStatusForm({ status })} />}
                  {canDeleteStatus && <IconButton icon="delete" label="Delete status" onClick={() => setDeletingStatus(status)} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <div className="mb-space-sm flex items-center justify-between">
            <span className="text-title-md font-bold text-on-surface">Ticket Priorities</span>
            {canCreatePriority && (
              <button
                type="button"
                onClick={() => setPriorityForm({ priority: null })}
                className="flex items-center gap-1 rounded-lg bg-surface-container px-2.5 py-1.5 text-label-sm font-semibold text-on-surface hover:bg-surface-container-high"
              >
                <Icon name="add" size={16} />
                Add Priority
              </button>
            )}
          </div>
          <div className="flex flex-col divide-y divide-surface-container-low">
            {priorities.map((priority) => (
              <div key={priority.id} className="flex items-center justify-between py-space-sm">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: priority.color }} />
                  <span className="text-title-sm font-semibold text-on-surface">{priority.name}</span>
                  <span className="font-code-sm text-code-sm text-secondary">Level {priority.level}</span>
                  {priority.isDefault && <Badge tone="secondary">Default</Badge>}
                </div>
                <div className="flex items-center gap-1">
                  {canUpdatePriority && <IconButton icon="edit" label="Edit priority" onClick={() => setPriorityForm({ priority })} />}
                  {canDeletePriority && <IconButton icon="delete" label="Delete priority" onClick={() => setDeletingPriority(priority)} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {statusForm && (
        <StatusFormModal isOpen status={statusForm.status} onClose={() => setStatusForm(null)} onSaved={refetch} />
      )}
      {priorityForm && (
        <PriorityFormModal isOpen priority={priorityForm.priority} onClose={() => setPriorityForm(null)} onSaved={refetch} />
      )}
      {deletingStatus && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeletingStatus(null)}
          title="Delete Status"
          description={`Delete "${deletingStatus.name}"? This is refused if any ticket currently uses it.`}
          successMessage={`"${deletingStatus.name}" deleted.`}
          onConfirm={async () => {
            await statusesApi.destroy(deletingStatus.id)
            refetch()
          }}
        />
      )}
      {deletingPriority && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeletingPriority(null)}
          title="Delete Priority"
          description={`Delete "${deletingPriority.name}"? This is refused if any ticket currently uses it.`}
          successMessage={`"${deletingPriority.name}" deleted.`}
          onConfirm={async () => {
            await prioritiesApi.destroy(deletingPriority.id)
            refetch()
          }}
        />
      )}
    </div>
  )
}
