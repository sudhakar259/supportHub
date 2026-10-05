import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { TextField } from '@/components/ui/TextField'
import { departmentsApi } from '@/features/departments/api/departmentsApi'
import { ApiError } from '@/types/api'
import type { Department } from '@/types/department'

export interface DepartmentsStepProps {
  onNext: () => void
}

export function DepartmentsStep({ onNext }: DepartmentsStepProps) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    departmentsApi
      .list({ perPage: 50 })
      .then((page) => setDepartments(page.items))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setIsSubmitting(true)
    try {
      const created = await departmentsApi.create({ name, code, isActive: true })
      setDepartments((prev) => [...prev, created])
      setName('')
      setCode('')
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) mapped[field] = messages[0]
        setFieldErrors(mapped)
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to reach the server.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <div>
        <h2 className="text-headline-md text-on-surface">Set up your departments</h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          Departments route tickets to the right team. You can add more anytime from Departments.
        </p>
      </div>

      {departments.length > 0 && (
        <ul className="flex flex-col gap-space-xs">
          {departments.map((d) => (
            <li key={d.id} className="flex items-center gap-space-sm rounded-lg bg-surface-container-low p-space-sm">
              <Icon name="apartment" size={18} className="text-secondary" />
              <span className="text-title-sm text-on-surface">{d.name}</span>
              <span className="font-code-sm text-code-sm text-secondary">{d.code}</span>
            </li>
          ))}
        </ul>
      )}

      {!isLoading && (
        <form onSubmit={handleAdd} className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm sm:flex-row sm:items-end">
          {error && <p className="text-body-sm text-error sm:basis-full">{error}</p>}
          <TextField
            label="Department Name"
            placeholder="e.g. Billing"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
            containerClassName="flex-1"
          />
          <TextField
            label="Code"
            placeholder="BILL"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            error={fieldErrors.code}
            containerClassName="sm:w-32"
          />
          <Button type="submit" variant="ghost" leadingIcon="add" isLoading={isSubmitting} disabled={!name || !code}>
            Add
          </Button>
        </form>
      )}

      <div className="flex justify-end gap-space-sm">
        <Button variant="ghost" onClick={onNext}>
          Skip for now
        </Button>
        <Button onClick={onNext} trailingIcon="arrow_forward">
          Continue
        </Button>
      </div>
    </div>
  )
}
