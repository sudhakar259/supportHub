import { useEffect, useState } from 'react'

import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { slaPoliciesApi } from '@/features/automation/api/slaPoliciesApi'
import { SlaPolicyFormModal } from '@/features/automation/components/SlaPolicyFormModal'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { hasPermission } from '@/types/user'
import type { SlaPolicy } from '@/types/slaPolicy'

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

export function SlaPoliciesPanel() {
  const { user } = useAuth()
  const canManage = hasPermission(user, 'sla.manage')
  const [policies, setPolicies] = useState<SlaPolicy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [formState, setFormState] = useState<{ policy: SlaPolicy | null } | null>(null)
  const [deletingPolicy, setDeletingPolicy] = useState<SlaPolicy | null>(null)

  useEffect(() => {
    setIsLoading(true)
    slaPoliciesApi
      .list()
      .then(setPolicies)
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false))
  }, [reloadToken])

  const refetch = () => setReloadToken((t) => t + 1)

  if (isLoading) return <LoadingState label="Loading SLA policies…" />
  if (error) return <ErrorState description={error.message} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-end">
        {canManage && (
          <button
            type="button"
            onClick={() => setFormState({ policy: null })}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-space-md py-2 text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            <Icon name="add" size={18} />
            Create SLA Policy
          </button>
        )}
      </div>

      {policies.length === 0 ? (
        <p className="rounded-xl bg-surface-container-lowest p-space-md text-center text-body-sm text-on-surface-variant shadow-sm">
          No SLA policies configured yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2 xl:grid-cols-3">
          {policies.map((policy) => (
            <div key={policy.id} className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
              <div className="flex items-start justify-between">
                <h3 className="text-title-md font-bold text-on-surface">{policy.name}</h3>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <IconButton icon="edit" label="Edit policy" onClick={() => setFormState({ policy })} />
                    <IconButton icon="delete" label="Delete policy" onClick={() => setDeletingPolicy(policy)} />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {policy.priority && <Badge tone="secondary">{policy.priority.name}</Badge>}
                {policy.department && <Badge tone="neutral">{policy.department.name}</Badge>}
                {policy.isDefault && <Badge tone="tertiary">Default</Badge>}
                {!policy.isActive && <Badge tone="danger">Inactive</Badge>}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-lg bg-surface-container-low p-space-sm">
                  <div className="text-label-sm text-secondary uppercase">First Response</div>
                  <div className="text-title-md font-bold text-on-surface">{formatMinutes(policy.firstResponseMinutes)}</div>
                </div>
                <div className="rounded-lg bg-surface-container-low p-space-sm">
                  <div className="text-label-sm text-secondary uppercase">Resolution</div>
                  <div className="text-title-md font-bold text-on-surface">{formatMinutes(policy.resolutionMinutes)}</div>
                </div>
              </div>
              {policy.businessHoursOnly && (
                <span className="flex items-center gap-1 text-label-sm text-secondary">
                  <Icon name="schedule" size={14} />
                  Business hours only
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {formState && (
        <SlaPolicyFormModal isOpen policy={formState.policy} onClose={() => setFormState(null)} onSaved={refetch} />
      )}
      {deletingPolicy && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeletingPolicy(null)}
          title="Delete SLA Policy"
          description={`Delete "${deletingPolicy.name}"?`}
          successMessage={`"${deletingPolicy.name}" deleted.`}
          onConfirm={async () => {
            await slaPoliciesApi.destroy(deletingPolicy.id)
            refetch()
          }}
        />
      )}
    </div>
  )
}
