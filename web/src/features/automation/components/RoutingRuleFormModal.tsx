import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/TextField'
import { routingRulesApi } from '@/features/automation/api/routingRulesApi'
import { RuleActionEditor } from '@/features/automation/components/RuleActionEditor'
import { RuleConditionEditor } from '@/features/automation/components/RuleConditionEditor'
import { lookupsApi } from '@/features/tickets/api/lookupsApi'
import { fetchOrDefault } from '@/utils/fetchOrDefault'
import { ApiError } from '@/types/api'
import type { Department } from '@/types/department'
import type { RoutingRule, RuleAction, RuleCondition } from '@/types/routingRule'
import type { TicketCategory, TicketPriority } from '@/types/ticket'
import type { User } from '@/types/user'

export interface RoutingRuleFormModalProps {
  isOpen: boolean
  rule: RoutingRule | null
  onClose: () => void
  onSaved: (rule: RoutingRule) => void
}

export function RoutingRuleFormModal({ isOpen, rule, onClose, onSaved }: RoutingRuleFormModalProps) {
  const toast = useToast()
  const [categories, setCategories] = useState<TicketCategory[]>([])
  const [priorities, setPriorities] = useState<TicketPriority[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [agents, setAgents] = useState<User[]>([])

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState(0)
  const [isActive, setIsActive] = useState(true)
  const [stopProcessing, setStopProcessing] = useState(false)
  const [conditions, setConditions] = useState<RuleCondition[]>([])
  const [actions, setActions] = useState<RuleAction[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    Promise.all([
      fetchOrDefault(lookupsApi.listCategories(), []),
      fetchOrDefault(lookupsApi.listPriorities(), []),
      fetchOrDefault(lookupsApi.listDepartments(), []),
      fetchOrDefault(lookupsApi.listAgents(), []),
    ]).then(
      ([c, p, d, a]) => {
        setCategories(c)
        setPriorities(p)
        setDepartments(d)
        setAgents(a)
      },
    )
    setName(rule?.name ?? '')
    setDescription(rule?.description ?? '')
    setPriority(rule?.priority ?? 0)
    setIsActive(rule?.isActive ?? true)
    setStopProcessing(rule?.stopProcessing ?? false)
    setConditions(rule?.conditions ?? [{ field: 'category_id', operator: '=', value: '' }])
    setActions(rule?.actions ?? [{ type: 'assign_department', value: '' }])
    setError(null)
  }, [isOpen, rule])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (conditions.length === 0) {
      setError('At least one condition is required.')
      return
    }
    if (actions.length === 0) {
      setError('At least one action is required.')
      return
    }
    setIsSubmitting(true)
    setError(null)

    const payload = { name, description: description || undefined, priority, isActive, stopProcessing, conditions, actions }

    try {
      const saved = rule ? await routingRulesApi.update(rule.id, payload) : await routingRulesApi.create(payload)
      toast.success(rule ? 'Routing Rule Updated' : 'Routing Rule Created', `"${saved.name}" has been saved.`)
      onSaved(saved)
      onClose()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to save routing rule.'
      setError(message)
      toast.error('Failed to Save Routing Rule', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={rule ? `Edit ${rule.name}` : 'Create Routing Rule'}
      maxWidthClassName="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="routing-rule-form" isLoading={isSubmitting} leadingIcon="save">
            {rule ? 'Save Changes' : 'Create Rule'}
          </Button>
        </>
      }
    >
      <form id="routing-rule-form" onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <TextField label="Rule Name" required value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rule-description" className="text-label-md uppercase tracking-wider text-secondary">
            Description
          </label>
          <textarea
            id="rule-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-y rounded-lg bg-surface-container-low p-space-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <TextField
          label="Priority"
          type="number"
          min={0}
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value))}
          helperText="Rules run in ascending priority order — lower numbers run first."
        />

        <RuleConditionEditor conditions={conditions} onChange={setConditions} categories={categories} priorities={priorities} />
        <RuleActionEditor actions={actions} onChange={setActions} departments={departments} agents={agents} priorities={priorities} />

        <div className="flex items-center gap-space-lg">
          <Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} label="Active" />
          <Checkbox
            checked={stopProcessing}
            onChange={(e) => setStopProcessing(e.target.checked)}
            label="Stop processing further rules once this one matches"
          />
        </div>
      </form>
    </Modal>
  )
}
