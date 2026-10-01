import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { SelectField } from '@/components/ui/SelectField'
import { TextField } from '@/components/ui/TextField'
import { customersApi } from '@/features/customers/api/customersApi'
import { CUSTOMER_TYPES } from '@/features/customers/types'
import type { Customer } from '@/types/customer'

export interface EditCustomerModalProps {
  customer: Customer | null
  onClose: () => void
  onUpdated: (customer: Customer) => void
}

export function EditCustomerModal({ customer, onClose, onUpdated }: EditCustomerModalProps) {
  const toast = useToast()
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [customerType, setCustomerType] = useState<string>('individual')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customer) return
    setPhone(customer.phone ?? '')
    setCompanyName(customer.companyName ?? '')
    setCustomerType(customer.customerType)
    setError(null)
  }, [customer])

  if (!customer) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!customer) return
    setIsSubmitting(true)
    setError(null)
    try {
      const updated = await customersApi.update(customer.id, {
        phone: phone || undefined,
        companyName: companyName || undefined,
        customerType: customerType as 'individual' | 'business' | 'vip',
      })
      toast.success('Customer Updated', `"${updated.user?.name ?? updated.companyName ?? 'Customer'}" has been saved.`)
      onUpdated(updated)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update customer.'
      setError(message)
      toast.error('Failed to Update Customer', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={Boolean(customer)}
      onClose={onClose}
      title={`Edit ${customer.user?.name ?? customer.companyName ?? 'Customer'}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-customer-form" isLoading={isSubmitting} leadingIcon="save">
            Save Changes
          </Button>
        </>
      }
    >
      <form id="edit-customer-form" onSubmit={handleSubmit} className="flex flex-col gap-space-md">
        {error && <p className="text-body-sm text-error">{error}</p>}
        <p className="text-body-sm text-on-surface-variant">
          Name and email live on the user account and aren&rsquo;t editable here — update those from the Users screen instead.
        </p>
        <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <TextField label="Company Name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
        <SelectField label="Customer Type" value={customerType} onChange={(e) => setCustomerType(e.target.value)}>
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
