import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField } from '@/components/ui/SelectField'
import { Switch } from '@/components/ui/Switch'
import { TextField } from '@/components/ui/TextField'
import { lookupsApi } from '@/features/tickets/api/lookupsApi'
import { departmentsApi } from '@/features/departments/api/departmentsApi'
import { fetchOrDefault } from '@/utils/fetchOrDefault'
import { ApiError } from '@/types/api'
import type { Department } from '@/types/department'
import type { User } from '@/types/user'

export interface DepartmentFormModalProps {
  isOpen: boolean
  department: Department | null
  onClose: () => void
  onSaved: (department: Department) => void
}

export function DepartmentFormModal({ isOpen, department, onClose, onSaved }: DepartmentFormModalProps) {
  const toast = useToast()
  const [managers, setManagers] = useState<User[]>([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [managerId, setManagerId] = useState<number | ''>('')
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen) return
    fetchOrDefault(lookupsApi.listAgents(), []).then(setManagers)
    setName(department?.name ?? '')
    setCode(department?.code ?? '')
    setDescription(department?.description ?? '')
    setManagerId(department?.manager?.id ?? '')
    setIsActive(department?.isActive ?? true)
    setError(null)
    setFieldErrors({})
  }, [isOpen, department])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    const payload = { name, code, description: description || undefined, managerId: managerId || undefined, isActive }

    try {
      const saved = department ? await departmentsApi.update(department.id, payload) : await departmentsApi.create(payload)
      toast.success(department ? 'Department updated' : 'Department created', `"${saved.name}" has been saved.`)
      onSaved(saved)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) mapped[field] = messages[0]
        setFieldErrors(mapped)
      } else {
        const message = err instanceof Error ? err.message : 'Failed to save department.'
        setError(message)
        toast.error('Failed to Save Department', message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={department ? `Edit ${department.name}` : 'Create Department'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="department-form" isLoading={isSubmitting} leadingIcon="save">
            {department ? 'Save Changes' : 'Create Department'}
          </Button>
        </>
      }
    >
      <form id="department-form" onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <TextField label="Name" required value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
        <TextField
          label="Code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          error={fieldErrors.code}
          helperText={!fieldErrors.code ? 'Short unique code used in ticket numbering, e.g. BILL' : undefined}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="department-description" className="text-label-md uppercase tracking-wider text-secondary">
            Description
          </label>
          <textarea
            id="department-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full resize-y rounded-lg bg-surface-container-low p-space-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <SelectField label="Manager (optional)" value={managerId} onChange={(e) => setManagerId(e.target.value ? Number(e.target.value) : '')}>
          <option value="">No manager</option>
          {managers.map((manager) => (
            <option key={manager.id} value={manager.id}>
              {manager.name}
            </option>
          ))}
        </SelectField>
        <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-space-md">
          <div>
            <div className="text-title-sm text-on-surface">Active</div>
            <div className="text-body-sm text-on-surface-variant">Inactive departments are hidden from routing and ticket creation.</div>
          </div>
          <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        </div>
      </form>
    </Modal>
  )
}
