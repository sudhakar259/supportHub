import { useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import type { ButtonVariant } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

export interface StatusActionDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  confirmLabel: string
  confirmVariant?: ButtonVariant
  confirmIcon?: string
  reasonRequired?: boolean
  onConfirm: (reason: string) => Promise<void>
  /** Toast shown after onConfirm resolves — e.g. "Ticket escalated." Falls back to a generic message. */
  successMessage?: string
}

/** Generic reason-prompt dialog shared by Escalate, Resolve, Close, and Reopen — all take the same `{ reason }` payload server-side. */
export function StatusActionDialog({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel,
  confirmVariant = 'primary',
  confirmIcon,
  reasonRequired = false,
  onConfirm,
  successMessage,
}: StatusActionDialogProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  async function handleSubmit() {
    if (reasonRequired && !reason.trim()) {
      setError('Please provide a reason.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm(reason)
      toast.success(successMessage ?? `${title} completed.`)
      setReason('')
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed.'
      setError(message)
      toast.error(`${title} Failed`, message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={confirmVariant} leadingIcon={confirmIcon} isLoading={isSubmitting} onClick={handleSubmit}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-sm">
        <p className="text-body-sm text-on-surface-variant">{description}</p>
        {error && <p className="text-body-sm text-error">{error}</p>}
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={reasonRequired ? 'Reason (required)…' : 'Reason (optional)…'}
          className="w-full resize-y rounded-lg bg-surface-container-low p-space-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </Modal>
  )
}
