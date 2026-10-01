import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { TextField } from '@/components/ui/TextField'
import { notificationTemplatesApi } from '@/features/automation/api/notificationTemplatesApi'
import { NOTIFICATION_TEMPLATE_VARIABLES } from '@/types/notification'
import type { NotificationTemplate } from '@/types/notification'

export interface NotificationTemplateEditModalProps {
  template: NotificationTemplate | null
  onClose: () => void
  onSaved: (template: NotificationTemplate) => void
}

export function NotificationTemplateEditModal({ template, onClose, onSaved }: NotificationTemplateEditModalProps) {
  const toast = useToast()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!template) return
    setSubject(template.subject)
    setBody(template.body)
    setIsActive(template.isActive)
    setError(null)
  }, [template])

  if (!template) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!template) return
    setIsSubmitting(true)
    setError(null)
    try {
      const saved = await notificationTemplatesApi.update(template.id, { subject, body, isActive })
      toast.success('Notification Template Updated', `"${saved.name}" has been saved.`)
      onSaved(saved)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save template.'
      setError(message)
      toast.error('Failed to Update Notification Template', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={Boolean(template)}
      onClose={onClose}
      title={`Edit "${template.name}"`}
      maxWidthClassName="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="notification-template-form" isLoading={isSubmitting} leadingIcon="save">
            Save Changes
          </Button>
        </>
      }
    >
      <form id="notification-template-form" onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <div className="flex flex-wrap gap-1.5 rounded-lg bg-surface-container-low p-space-sm">
          <span className="text-label-sm text-secondary">Variables:</span>
          {NOTIFICATION_TEMPLATE_VARIABLES.map((v) => (
            <span key={v} className="rounded bg-surface-container px-1.5 py-0.5 font-code-sm text-code-sm text-on-surface">
              {v}
            </span>
          ))}
        </div>
        <TextField label="Subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="template-body" className="text-label-md uppercase tracking-wider text-secondary">
            Body
          </label>
          <textarea
            id="template-body"
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="w-full resize-y rounded-lg bg-surface-container-low p-space-md font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} label="Active" />
      </form>
    </Modal>
  )
}
