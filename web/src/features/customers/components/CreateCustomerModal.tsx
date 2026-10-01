import type { FormEvent } from 'react'
import { useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { PasswordField } from '@/components/ui/PasswordField'
import { SelectField } from '@/components/ui/SelectField'
import { TextField } from '@/components/ui/TextField'
import { customersApi } from '@/features/customers/api/customersApi'
import { CUSTOMER_TYPES } from '@/features/customers/types'
import { ApiError } from '@/types/api'
import type { Customer } from '@/types/customer'

export interface CreateCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (customer: Customer) => void
}

export function CreateCustomerModal({ isOpen, onClose, onCreated }: CreateCustomerModalProps) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [customerType, setCustomerType] = useState<(typeof CUSTOMER_TYPES)[number]>('individual')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    try {
      const customer = await customersApi.create({
        name,
        email,
        password,
        passwordConfirmation,
        phone: phone || undefined,
        companyName: companyName || undefined,
        customerType,
      })
      toast.success('Customer Created', `${name} (${email}) has been added.`)
      onCreated(customer)
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) mapped[field] = messages[0]
        setFieldErrors(mapped)
      } else {
        const message = err instanceof Error ? err.message : 'Failed to create customer.'
        setError(message)
        toast.error('Failed to Create Customer', message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Customer"
      maxWidthClassName="max-w-xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-customer-form" isLoading={isSubmitting} leadingIcon="person_add">
            Create Customer
          </Button>
        </>
      }
    >
      <form id="create-customer-form" onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <TextField label="Full Name" required value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} />
        <TextField label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
        <div className="grid grid-cols-2 gap-space-sm">
          <PasswordField label="Password" required value={password} onChange={(e) => setPassword(e.target.value)} error={fieldErrors.password} />
          <PasswordField label="Confirm Password" required value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)} />
        </div>
        <TextField label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <TextField label="Company Name (optional)" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        <SelectField label="Customer Type" value={customerType} onChange={(e) => setCustomerType(e.target.value as (typeof CUSTOMER_TYPES)[number])}>
          {CUSTOMER_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectField>
      </form>
    </Modal>
  )
}
