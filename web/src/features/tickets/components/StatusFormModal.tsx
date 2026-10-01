import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/TextField'
import type { StatusFormPayload } from '@/features/tickets/api/statusesApi'
import { statusesApi } from '@/features/tickets/api/statusesApi'
import { ApiError } from '@/types/api'
import type { TicketStatus } from '@/types/ticket'

export interface StatusFormModalProps {
  isOpen: boolean
  status: TicketStatus | null
  onClose: () => void
  onSaved: (status: TicketStatus) => void
}

export function StatusFormModal({ isOpen, status, onClose, onSaved }: StatusFormModalProps) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [color, setColor] = useState('#6B7280')
  const [isClosed, setIsClosed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen) return
    setName(status?.name ?? '')
    setSlug(status?.slug ?? '')
    setColor(status?.color ?? '#6B7280')
    setIsClosed(status?.isClosed ?? false)
    setError(null)
    setFieldErrors({})
  }, [isOpen, status])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    const payload: StatusFormPayload = { name, slug: slug || undefined, color, isClosed }

    try {
      const saved = status ? await statusesApi.update(status.id, payload) : await statusesApi.create(payload)
      toast.success(status ? 'Status Updated' : 'Status Created', `"${saved.name}" has been saved.`)
      onSaved(saved)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) mapped[field] = messages[0]
        setFieldErrors(mapped)
      } else {
        const message = err instanceof Error ? err.message : 'Failed to save status.'
        setError(message)
        toast.error('Failed to Save Status', message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={status ? `Edit ${status.name}` : 'Create Status'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="status-form" isLoading={isSubmitting} leadingIcon="save">
            {status ? 'Save Changes' : 'Create Status'}
          </Button>
        </>
      }
    >
      <form id="status-form" onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <TextField label="Name" required value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
        <TextField
          label="Slug"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          error={fieldErrors.slug}
          helperText={!fieldErrors.slug ? 'Unique internal identifier, e.g. on-hold' : undefined}
        />
        <div className="flex items-center gap-space-md">
          <label htmlFor="status-color" className="text-label-md uppercase tracking-wider text-secondary">
            Color
          </label>
          <input id="status-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-16 cursor-pointer rounded" />
          <span className="font-code-sm text-code-sm text-secondary">{color}</span>
        </div>
        <Checkbox
          checked={isClosed}
          onChange={(e) => setIsClosed(e.target.checked)}
          label="Terminal / closed state"
          description={<span className="text-secondary">Tickets in this status are treated as finished.</span>}
        />
      </form>
    </Modal>
  )
}
