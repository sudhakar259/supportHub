import { useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Switch } from '@/components/ui/Switch'
import { TextField } from '@/components/ui/TextField'
import { customersApi } from '@/features/customers/api/customersApi'
import type { EraseCustomerResult } from '@/features/customers/api/customersApi'
import { ApiError } from '@/types/api'

export interface EraseCustomerDialogProps {
  isOpen: boolean
  onClose: () => void
  customerId: number
  /** The address the person must type back — the customer's email on record. */
  customerEmail: string
  customerName: string
  onErased: (result: EraseCustomerResult) => void
}

/** Irreversible anonymization of a customer, guarded by typing their email back. */
export function EraseCustomerDialog({ isOpen, onClose, customerId, customerEmail, customerName, onErased }: EraseCustomerDialogProps) {
  const toast = useToast()
  const [typed, setTyped] = useState('')
  const [redactContent, setRedactContent] = useState(true)
  const [isErasing, setIsErasing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matches = typed.trim().toLowerCase() === customerEmail.toLowerCase()

  function close() {
    setTyped('')
    setError(null)
    setRedactContent(true)
    onClose()
  }

  async function erase() {
    setIsErasing(true)
    setError(null)
    try {
      const result = await customersApi.erase(customerId, { confirmEmail: typed.trim(), redactContent })
      toast.success('Customer Data Erased', `${customerName} has been anonymized.`)
      close()
      onErased(result)
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldError('confirm_email') ?? err.message) : 'Could not erase this customer.')
    } finally {
      setIsErasing(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Erase customer data"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button variant="danger" leadingIcon="delete_forever" isLoading={isErasing} disabled={!matches} onClick={erase}>
            Erase permanently
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-space-md">
        <p className="text-body-sm text-on-surface-variant">
          This permanently removes <strong>{customerName}</strong>’s name, email, phone, company and sign-in, and signs them out everywhere. <strong>It cannot be undone.</strong> Consider downloading a copy of their data first.
        </p>

        <Switch
          label="Also remove the text of their tickets, all messages and attachments"
          checked={redactContent}
          onChange={(e) => setRedactContent(e.target.checked)}
        />
        <p className="-mt-2 text-body-sm text-on-surface-variant">
          {redactContent
            ? 'Recommended for an erasure request. The ticket records stay (numbers, dates, status) so your reports are not affected.'
            : 'The ticket text stays for your records, but the person can no longer be identified from their account. Names written inside the text are not removed.'}
        </p>

        {error && (
          <p role="alert" className="rounded-lg bg-error-container p-space-md text-body-sm text-on-error-container">
            {error}
          </p>
        )}

        <TextField
          label={`Type ${customerEmail} to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
        />
      </div>
    </Modal>
  )
}
