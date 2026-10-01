import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { SelectField } from '@/components/ui/SelectField'
import { TextField } from '@/components/ui/TextField'
import { slaPoliciesApi } from '@/features/automation/api/slaPoliciesApi'
import { lookupsApi } from '@/features/tickets/api/lookupsApi'
import { fetchOrDefault } from '@/utils/fetchOrDefault'
import { ApiError } from '@/types/api'
import type { Department } from '@/types/department'
import type { SlaPolicy } from '@/types/slaPolicy'
import type { TicketPriority } from '@/types/ticket'

export interface SlaPolicyFormModalProps {
  isOpen: boolean
  policy: SlaPolicy | null
  onClose: () => void
  onSaved: (policy: SlaPolicy) => void
}

export function SlaPolicyFormModal({ isOpen, policy, onClose, onSaved }: SlaPolicyFormModalProps) {
  const toast = useToast()
  const [priorities, setPriorities] = useState<TicketPriority[]>([])
  const [departments, setDepartments] = useState<Department[]>([])

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [priorityId, setPriorityId] = useState<number | ''>('')
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [firstResponseMinutes, setFirstResponseMinutes] = useState(60)
  const [resolutionMinutes, setResolutionMinutes] = useState(480)
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false)
  const [isDefault, setIsDefault] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen) return
    Promise.all([fetchOrDefault(lookupsApi.listPriorities(), []), fetchOrDefault(lookupsApi.listDepartments(), [])]).then(([p, d]) => {
      setPriorities(p)
      setDepartments(d)
    })
    setName(policy?.name ?? '')
    setDescription(policy?.description ?? '')
    setPriorityId(policy?.priority?.id ?? '')
    setDepartmentId(policy?.department?.id ?? '')
    setFirstResponseMinutes(policy?.firstResponseMinutes ?? 60)
    setResolutionMinutes(policy?.resolutionMinutes ?? 480)
    setBusinessHoursOnly(policy?.businessHoursOnly ?? false)
    setIsDefault(policy?.isDefault ?? false)
    setIsActive(policy?.isActive ?? true)
    setError(null)
    setFieldErrors({})
  }, [isOpen, policy])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    const payload = {
      name,
      description: description || undefined,
      priorityId: priorityId || undefined,
      departmentId: departmentId || undefined,
      firstResponseMinutes,
      resolutionMinutes,
      businessHoursOnly,
      isDefault,
      isActive,
    }

    try {
      const saved = policy ? await slaPoliciesApi.update(policy.id, payload) : await slaPoliciesApi.create(payload)
      toast.success(policy ? 'SLA Policy Updated' : 'SLA Policy Created', `"${saved.name}" has been saved.`)
      onSaved(saved)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) mapped[field] = messages[0]
        setFieldErrors(mapped)
      } else {
        const message = err instanceof Error ? err.message : 'Failed to save SLA policy.'
        setError(message)
        toast.error('Failed to Save SLA Policy', message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={policy ? `Edit ${policy.name}` : 'Create SLA Policy'}
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="sla-policy-form" isLoading={isSubmitting} leadingIcon="save">
            {policy ? 'Save Changes' : 'Create Policy'}
          </Button>
        </>
      }
    >
      <form id="sla-policy-form" onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <TextField label="Name" required value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sla-description" className="text-label-md uppercase tracking-wider text-secondary">
            Description
          </label>
          <textarea
            id="sla-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-y rounded-lg bg-surface-container-low p-space-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="grid grid-cols-2 gap-space-sm">
          <SelectField label="Priority (optional)" value={priorityId} onChange={(e) => setPriorityId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">All priorities</option>
            {priorities.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Department (optional)" value={departmentId} onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="grid grid-cols-2 gap-space-sm">
          <TextField
            label="First Response (minutes)"
            type="number"
            min={1}
            required
            value={firstResponseMinutes}
            onChange={(e) => setFirstResponseMinutes(Number(e.target.value))}
            error={fieldErrors.first_response_minutes}
          />
          <TextField
            label="Resolution (minutes)"
            type="number"
            min={1}
            required
            value={resolutionMinutes}
            onChange={(e) => setResolutionMinutes(Number(e.target.value))}
            error={fieldErrors.resolution_minutes}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Checkbox checked={businessHoursOnly} onChange={(e) => setBusinessHoursOnly(e.target.checked)} label="Count only business hours" />
          <Checkbox checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} label="Default policy for this priority/department" />
          <Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} label="Active" />
        </div>
      </form>
    </Modal>
  )
}
