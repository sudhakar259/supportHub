import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { TextField } from '@/components/ui/TextField'
import { webhooksApi } from '@/features/webhooks/api/webhooksApi'
import type { Webhook, WebhookEvent } from '@/features/webhooks/types'
import { WEBHOOK_EVENTS } from '@/features/webhooks/types'
import { ApiError } from '@/types/api'

export interface WebhookFormModalProps {
  isOpen: boolean
  webhook: Webhook | null
  onClose: () => void
  onSaved: (webhook: Webhook) => void
  /** Only fired on create — a webhook's signing secret is only ever returned from the store() response. */
  onCreatedWithSecret: (webhookId: number, secret: string, events: WebhookEvent[]) => void
}

export function WebhookFormModal({ isOpen, webhook, onClose, onSaved, onCreatedWithSecret }: WebhookFormModalProps) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen) return
    setName(webhook?.name ?? '')
    setUrl(webhook?.url ?? '')
    setEvents(webhook?.events ?? [])
    setIsActive(webhook?.isActive ?? true)
    setError(null)
    setFieldErrors({})
  }, [isOpen, webhook])

  function toggleEvent(event: WebhookEvent) {
    setEvents((prev) => (prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    const payload = { name, url, events, isActive }

    try {
      if (webhook) {
        const saved = await webhooksApi.update(webhook.id, payload)
        toast.success('Webhook updated', `"${saved.name}" has been saved.`)
        onSaved(saved)
        onClose()
      } else {
        const created = await webhooksApi.create(payload)
        onClose()
        onCreatedWithSecret(created.id, created.secret, created.events)
      }
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) mapped[field] = messages[0]
        setFieldErrors(mapped)
      } else {
        const message = err instanceof Error ? err.message : 'Failed to save webhook.'
        setError(message)
        toast.error('Failed to Save Webhook', message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={webhook ? `Edit ${webhook.name}` : 'Create Webhook'}
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="webhook-form" isLoading={isSubmitting} disabled={events.length === 0} leadingIcon="save">
            {webhook ? 'Save Changes' : 'Create Webhook'}
          </Button>
        </>
      }
    >
      <form id="webhook-form" onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <TextField label="Name" required value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
        <TextField
          label="Payload URL"
          required
          type="url"
          placeholder="https://example.com/webhooks/supporthub"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          error={fieldErrors.url}
          helperText={!fieldErrors.url ? 'Must be a publicly reachable HTTPS URL — localhost and private IPs are rejected.' : undefined}
        />

        <div className="flex flex-col gap-space-xs">
          <label className="text-title-sm text-on-surface">
            Events <span className="text-primary">*</span>
          </label>
          <div className="flex flex-col gap-space-xs rounded-lg bg-surface-container-low p-space-sm">
            {WEBHOOK_EVENTS.map(({ event, description }) => (
              <div key={event} className="rounded-lg p-space-xs transition-colors hover:bg-surface-container-high">
                <Checkbox
                  checked={events.includes(event)}
                  onChange={() => toggleEvent(event)}
                  label={<span className="font-code-sm text-code-sm">{event}</span>}
                  description={<span className="text-body-sm text-on-surface-variant">{description}</span>}
                />
              </div>
            ))}
          </div>
          {fieldErrors.events && <p className="text-body-sm text-error">{fieldErrors.events}</p>}
        </div>

        <div className="flex items-center justify-between rounded-lg bg-surface-container-low p-space-md">
          <div>
            <div className="text-title-sm text-on-surface">Active</div>
            <div className="text-body-sm text-on-surface-variant">Inactive webhooks are not triggered by any event.</div>
          </div>
          <Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        </div>
      </form>
    </Modal>
  )
}
