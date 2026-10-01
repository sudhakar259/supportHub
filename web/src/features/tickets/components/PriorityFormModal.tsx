import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/TextField'
import type { PriorityFormPayload } from '@/features/tickets/api/prioritiesApi'
import { prioritiesApi } from '@/features/tickets/api/prioritiesApi'
import { ApiError } from '@/types/api'
import type { TicketPriority } from '@/types/ticket'

export interface PriorityFormModalProps {
  isOpen: boolean
  priority: TicketPriority | null
  onClose: () => void
  onSaved: (priority: TicketPriority) => void
}

export function PriorityFormModal({ isOpen, priority, onClose, onSaved }: PriorityFormModalProps) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [level, setLevel] = useState(1)
  const [color, setColor] = useState('#3B82F6')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen) return
    setName(priority?.name ?? '')
    setSlug(priority?.slug ?? '')
    setLevel(priority?.level ?? 1)
    setColor(priority?.color ?? '#3B82F6')
    setError(null)
    setFieldErrors({})
  }, [isOpen, priority])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    const payload: PriorityFormPayload = { name, slug: slug || undefined, level, color }

    try {
      const saved = priority ? await prioritiesApi.update(priority.id, payload) : await prioritiesApi.create(payload)
      toast.success(priority ? 'Priority Updated' : 'Priority Created', `"${saved.name}" has been saved.`)
      onSaved(saved)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) mapped[field] = messages[0]
        setFieldErrors(mapped)
      } else {
        const message = err instanceof Error ? err.message : 'Failed to save priority.'
        setError(message)
        toast.error('Failed to Save Priority', message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={priority ? `Edit ${priority.name}` : 'Create Priority'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="priority-form" isLoading={isSubmitting} leadingIcon="save">
            {priority ? 'Save Changes' : 'Create Priority'}
          </Button>
        </>
      }
    >
      <form id="priority-form" onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <TextField label="Name" required value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
        <TextField
          label="Slug"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          error={fieldErrors.slug}
          helperText={!fieldErrors.slug ? 'Unique internal identifier, e.g. critical' : undefined}
        />
        <TextField
          label="Level"
          type="number"
          min={1}
          required
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          error={fieldErrors.level}
          helperText={!fieldErrors.level ? 'Higher number means more urgent.' : undefined}
        />
        <div className="flex items-center gap-space-md">
          <label htmlFor="priority-color" className="text-label-md uppercase tracking-wider text-secondary">
            Color
          </label>
          <input id="priority-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-16 cursor-pointer rounded" />
          <span className="font-code-sm text-code-sm text-secondary">{color}</span>
        </div>
      </form>
    </Modal>
  )
}
