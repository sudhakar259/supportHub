import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField } from '@/components/ui/SelectField'
import { Switch } from '@/components/ui/Switch'
import { TextField } from '@/components/ui/TextField'
import { categoriesApi } from '@/features/categories/api/categoriesApi'
import { lookupsApi } from '@/features/tickets/api/lookupsApi'
import { fetchOrDefault } from '@/utils/fetchOrDefault'
import { ApiError } from '@/types/api'
import type { Department } from '@/types/department'
import type { TicketCategory } from '@/types/ticket'

export interface CategoryFormModalProps {
  isOpen: boolean
  category: TicketCategory | null
  /** Pre-selects this as the parent when creating a subcategory from a parent row's "Add subcategory" action. */
  defaultParentId?: number
  topLevelCategories: TicketCategory[]
  onClose: () => void
  onSaved: (category: TicketCategory) => void
}

export function CategoryFormModal({ isOpen, category, defaultParentId, topLevelCategories, onClose, onSaved }: CategoryFormModalProps) {
  const toast = useToast()
  const [departments, setDepartments] = useState<Department[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [parentId, setParentId] = useState<number | ''>('')
  const [departmentId, setDepartmentId] = useState<number | ''>('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen) return
    fetchOrDefault(lookupsApi.listDepartments(), []).then(setDepartments)
    setName(category?.name ?? '')
    setSlug(category?.slug ?? '')
    setParentId(category?.parentId ?? defaultParentId ?? '')
    setDepartmentId(category?.departmentId ?? '')
    setDescription(category?.description ?? '')
    setIsActive(category?.isActive ?? true)
    setError(null)
    setFieldErrors({})
  }, [isOpen, category, defaultParentId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    const payload = {
      name,
      slug: slug || undefined,
      parentId: parentId || undefined,
      departmentId: departmentId || undefined,
      description: description || undefined,
      isActive,
    }

    try {
      const saved = category ? await categoriesApi.update(category.id, payload) : await categoriesApi.create(payload)
      toast.success(category ? 'Category updated' : 'Category created', `"${saved.name}" has been saved.`)
      onSaved(saved)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) mapped[field] = messages[0]
        setFieldErrors(mapped)
      } else {
        const message = err instanceof Error ? err.message : 'Failed to save category.'
        setError(message)
        toast.error('Failed to Save Category', message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={category ? `Edit ${category.name}` : 'Create Category'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" isLoading={isSubmitting} leadingIcon="save">
            {category ? 'Save Changes' : 'Create Category'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <TextField label="Name" required value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
        <TextField
          label="Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          error={fieldErrors.slug}
          helperText={!fieldErrors.slug ? 'Leave blank to auto-generate from the name.' : undefined}
        />
        <SelectField label="Parent Category" value={parentId} onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : '')}>
          <option value="">None (top-level category)</option>
          {topLevelCategories
            .filter((c) => c.id !== category?.id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </SelectField>
        <SelectField label="Department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}>
          <option value="">No department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </SelectField>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="category-description" className="text-label-md uppercase tracking-wider text-secondary">
            Description
          </label>
          <textarea
            id="category-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full resize-y rounded-lg bg-surface-container-low p-space-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-space-md">
          <span className="text-title-sm text-on-surface">Active</span>
          <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        </div>
      </form>
    </Modal>
  )
}
