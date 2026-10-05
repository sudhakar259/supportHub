import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { SelectField } from '@/components/ui/SelectField'
import { Switch } from '@/components/ui/Switch'
import { TextField } from '@/components/ui/TextField'
import { platformMembershipPlansApi } from '@/features/platform/api/platformMembershipPlansApi'
import type { BillingInterval, MembershipPlan, MembershipPlanLimits } from '@/features/tenants/types'
import { ApiError } from '@/types/api'

export interface PlanFormModalProps {
  isOpen: boolean
  plan: MembershipPlan | null
  onClose: () => void
  onSaved: (plan: MembershipPlan) => void
}

const LIMIT_FIELDS: { key: keyof MembershipPlanLimits; label: string }[] = [
  { key: 'users', label: 'Users' },
  { key: 'customers', label: 'Customers' },
  { key: 'ticketsPerMonth', label: 'Tickets per Month' },
  { key: 'departments', label: 'Departments' },
  { key: 'apiRequestsPerDay', label: 'API Requests per Day' },
  { key: 'webhooks', label: 'Webhooks' },
]

const EMPTY_LIMITS: MembershipPlanLimits = {
  users: null,
  customers: null,
  ticketsPerMonth: null,
  departments: null,
  apiRequestsPerDay: null,
  webhooks: null,
}

export function PlanFormModal({ isOpen, plan, onClose, onSaved }: PlanFormModalProps) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [priceDollars, setPriceDollars] = useState('0')
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly')
  const [limits, setLimits] = useState<MembershipPlanLimits>(EMPTY_LIMITS)
  const [isActive, setIsActive] = useState(true)
  const [sortOrder, setSortOrder] = useState('0')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen) return
    setName(plan?.name ?? '')
    setSlug(plan?.slug ?? '')
    setDescription(plan?.description ?? '')
    setPriceDollars(plan ? (plan.priceCents / 100).toString() : '0')
    setBillingInterval(plan?.billingInterval ?? 'monthly')
    setLimits(plan?.limits ?? EMPTY_LIMITS)
    setIsActive(plan?.isActive ?? true)
    setSortOrder('0')
    setError(null)
    setFieldErrors({})
  }, [isOpen, plan])

  function updateLimit(key: keyof MembershipPlanLimits, value: number | null) {
    setLimits((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    const payload = {
      name,
      slug,
      description: description || null,
      priceCents: Math.round(parseFloat(priceDollars || '0') * 100),
      billingInterval,
      limits,
      isActive,
      // The API never returns sort_order on read (write-only field), so there's no
      // current value to pre-fill when editing — omit it on edit rather than risk
      // silently resetting an existing plan's position to 0.
      sortOrder: plan ? undefined : parseInt(sortOrder, 10) || 0,
    }

    try {
      const saved = plan ? await platformMembershipPlansApi.update(plan.id, payload) : await platformMembershipPlansApi.create(payload)
      toast.success(plan ? 'Plan updated' : 'Plan created', `"${saved.name}" has been saved.`)
      onSaved(saved)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) mapped[field] = messages[0]
        setFieldErrors(mapped)
      } else {
        const message = err instanceof Error ? err.message : 'Failed to save plan.'
        setError(message)
        toast.error('Failed to Save Plan', message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={plan ? `Edit ${plan.name}` : 'Create Membership Plan'}
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="plan-form" isLoading={isSubmitting} leadingIcon="save">
            {plan ? 'Save Changes' : 'Create Plan'}
          </Button>
        </>
      }
    >
      <form id="plan-form" onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <div className="grid grid-cols-2 gap-space-sm">
          <TextField label="Name" required value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
          <TextField
            label="Slug"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            error={fieldErrors.slug}
            helperText={!fieldErrors.slug ? 'Used in registration/checkout links — changing it won’t affect existing tenants.' : undefined}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="plan-description" className="text-label-md uppercase tracking-wider text-secondary">
            Description
          </label>
          <textarea
            id="plan-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-y rounded-lg bg-surface-container-low p-space-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className={plan ? 'grid grid-cols-2 gap-space-sm' : 'grid grid-cols-3 gap-space-sm'}>
          <TextField
            label="Price (USD)"
            type="number"
            min="0"
            step="0.01"
            required
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
            error={fieldErrors.price_cents}
          />
          <SelectField
            label="Billing Interval"
            value={billingInterval}
            onChange={(e) => setBillingInterval(e.target.value as BillingInterval)}
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </SelectField>
          {!plan && (
            <TextField
              label="Sort Order"
              type="number"
              min="0"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              helperText="Lower numbers appear first on the pricing page."
            />
          )}
        </div>

        <div className="flex flex-col gap-space-sm rounded-lg bg-surface-container-low p-space-md">
          <span className="text-title-sm text-on-surface">Feature Limits</span>
          <p className="text-body-sm text-on-surface-variant">Leave a field unlimited for no cap on that feature.</p>
          <div className="grid grid-cols-2 gap-space-sm">
            {LIMIT_FIELDS.map(({ key, label }) => {
              const value = limits[key]
              const unlimited = value === null
              return (
                <div key={key} className="flex flex-col gap-1">
                  <TextField
                    label={label}
                    type="number"
                    min="0"
                    disabled={unlimited}
                    value={unlimited ? '' : String(value)}
                    onChange={(e) => updateLimit(key, e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                  />
                  <Checkbox
                    label="Unlimited"
                    checked={unlimited}
                    onChange={(e) => updateLimit(key, e.target.checked ? null : 0)}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-space-md">
          <div>
            <div className="text-title-sm text-on-surface">Active</div>
            <div className="text-body-sm text-on-surface-variant">Inactive plans are hidden from the public pricing page but existing subscribers are unaffected.</div>
          </div>
          <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        </div>
      </form>
    </Modal>
  )
}
