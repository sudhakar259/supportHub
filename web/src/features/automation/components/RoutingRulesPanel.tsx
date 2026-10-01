import { useEffect, useState } from 'react'

import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { routingRulesApi } from '@/features/automation/api/routingRulesApi'
import { RoutingRuleFormModal } from '@/features/automation/components/RoutingRuleFormModal'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { hasPermission } from '@/types/user'
import type { RoutingRule } from '@/types/routingRule'

export function RoutingRulesPanel() {
  const { user } = useAuth()
  const canManage = hasPermission(user, 'routing.manage')
  const [rules, setRules] = useState<RoutingRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [formState, setFormState] = useState<{ rule: RoutingRule | null } | null>(null)
  const [deletingRule, setDeletingRule] = useState<RoutingRule | null>(null)

  useEffect(() => {
    setIsLoading(true)
    routingRulesApi
      .list()
      .then(setRules)
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false))
  }, [reloadToken])

  const refetch = () => setReloadToken((t) => t + 1)

  if (isLoading) return <LoadingState label="Loading routing rules…" />
  if (error) return <ErrorState description={error.message} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-on-surface-variant">
          Rules run in priority order (lowest first) against every newly-created ticket.
        </p>
        {canManage && (
          <button
            type="button"
            onClick={() => setFormState({ rule: null })}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-space-md py-2 text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            <Icon name="add" size={18} />
            Create Rule
          </button>
        )}
      </div>

      {rules.length === 0 ? (
        <p className="rounded-xl bg-surface-container-lowest p-space-md text-center text-body-sm text-on-surface-variant shadow-sm">
          No routing rules configured yet.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-surface-container-low rounded-xl bg-surface-container-lowest shadow-sm">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between gap-space-md p-space-md">
              <div className="flex items-center gap-space-md">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container font-code-sm text-code-sm font-bold text-secondary">
                  {rule.priority}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-title-sm font-bold text-on-surface">{rule.name}</span>
                    {!rule.isActive && <Badge tone="danger">Inactive</Badge>}
                    {rule.stopProcessing && <Badge tone="secondary">Stops chain</Badge>}
                  </div>
                  <p className="text-body-sm text-on-surface-variant">
                    {rule.conditions.length} condition{rule.conditions.length === 1 ? '' : 's'} · {rule.actions.length} action
                    {rule.actions.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-1">
                  <IconButton icon="edit" label="Edit rule" onClick={() => setFormState({ rule })} />
                  <IconButton icon="delete" label="Delete rule" onClick={() => setDeletingRule(rule)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {formState && (
        <RoutingRuleFormModal isOpen rule={formState.rule} onClose={() => setFormState(null)} onSaved={refetch} />
      )}
      {deletingRule && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeletingRule(null)}
          title="Delete Routing Rule"
          description={`Delete "${deletingRule.name}"? This cannot be undone.`}
          successMessage={`"${deletingRule.name}" deleted.`}
          onConfirm={async () => {
            await routingRulesApi.destroy(deletingRule.id)
            refetch()
          }}
        />
      )}
    </div>
  )
}
