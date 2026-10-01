import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import type { ButtonVariant } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/feedback/ToastProvider'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  confirmLabel?: string
  confirmVariant?: ButtonVariant
  onConfirm: () => Promise<void>
  /** Toast shown after onConfirm resolves — e.g. "Category deleted." Falls back to a generic message. */
  successMessage?: string
}

/** Generic destructive-action confirmation, e.g. deleting a department, category, status, or role. */
export function ConfirmDialog({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = 'Delete',
  confirmVariant = 'danger',
  onConfirm,
  successMessage,
}: ConfirmDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  async function handleConfirm() {
    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm()
      toast.success(successMessage ?? `${title} completed.`)
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
      maxWidthClassName="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={confirmVariant} isLoading={isSubmitting} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-sm">
        <p className="text-body-sm text-on-surface-variant">{description}</p>
        {error && <p className="text-body-sm text-error">{error}</p>}
      </div>
    </Modal>
  )
}
