import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useToast } from '@/components/feedback/ToastProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { SelectField } from '@/components/ui/SelectField'
import { TextField } from '@/components/ui/TextField'
import { lookupsApi } from '@/features/tickets/api/lookupsApi'
import { ticketsApi } from '@/features/tickets/api/ticketsApi'
import { AttachmentPicker } from '@/features/tickets/components/AttachmentPicker'
import { useTicketLookups } from '@/features/tickets/hooks/useTicketLookups'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { hasRole } from '@/types/user'
import { ApiError } from '@/types/api'
import type { Customer } from '@/types/customer'
import { cn } from '@/utils/cn'
import { fetchOrDefault } from '@/utils/fetchOrDefault'

const SUBJECT_MAX = 150
const DESCRIPTION_MAX = 20000

export function CreateTicketPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isStaff = !hasRole(user, 'Customer')
  const { categories, priorities, isLoading: lookupsLoading } = useTicketLookups()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState<number | ''>('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [priorityId, setPriorityId] = useState<number | ''>('')
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isStaff) fetchOrDefault(lookupsApi.listCustomers(), []).then(setCustomers)
  }, [isStaff])

  useEffect(() => {
    const defaultPriority = priorities.find((p) => p.isDefault)
    if (defaultPriority && priorityId === '') setPriorityId(defaultPriority.id)
  }, [priorities, priorityId])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    try {
      const ticket = await ticketsApi.create({
        subject,
        description,
        categoryId: categoryId || undefined,
        priorityId: priorityId || undefined,
        customerId: isStaff ? (customerId || undefined) : undefined,
      })
      // The ticket exists now, so a file that fails must not undo it: upload one
      // by one, then say which (if any) did not make it.
      const results = await Promise.allSettled(files.map((file) => ticketsApi.uploadAttachment(ticket.id, file)))
      const failed = results.filter((r) => r.status === 'rejected').length

      if (failed > 0) {
        toast.warning('Ticket Created, Some Files Failed', `Ticket ${ticket.ticketNumber} was created, but ${failed} of ${files.length} file(s) could not be attached. Add them from the ticket.`)
      } else {
        toast.success('Ticket Created', `Ticket ${ticket.ticketNumber} has been created.`)
      }
      navigate(ROUTES.ticketDetails(ticket.id))
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) mapped[field] = messages[0]
        setFieldErrors(mapped)
      } else {
        const message = err instanceof Error ? err.message : 'Failed to create ticket.'
        setError(message)
        toast.error('Failed to Create Ticket', message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-space-lg pb-space-xl">
      <PageHeader breadcrumbs={[{ label: 'Workspace' }, { label: 'Tickets', to: ROUTES.tickets }, { label: 'Create Ticket' }]} title="Create New Support Ticket" />

      <form onSubmit={handleSubmit} className="mx-gutter-lg flex max-w-3xl flex-col gap-gutter">
        {error && <p className="rounded-lg bg-error-container p-space-md text-body-sm text-on-error-container">{error}</p>}

        {isStaff && (
          <div className="flex flex-col gap-gutter rounded-xl bg-surface-container-lowest p-gutter-lg shadow-sm">
            <h2 className="text-headline-sm text-on-surface">Customer</h2>
            <SelectField
              label="Requesting customer *"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select a customer…</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.user?.name ?? customer.companyName ?? `Customer #${customer.id}`}
                  {customer.companyName && customer.user?.name ? ` — ${customer.companyName}` : ''}
                </option>
              ))}
            </SelectField>
            {fieldErrors.customer_id && <p className="text-body-sm text-error">{fieldErrors.customer_id}</p>}
          </div>
        )}

        <div className="flex flex-col gap-gutter rounded-xl bg-surface-container-lowest p-gutter-lg shadow-sm">
          <h2 className="text-headline-sm text-on-surface">Incident Details</h2>

          <TextField
            label="Subject *"
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, SUBJECT_MAX))}
            error={fieldErrors.subject}
            helperText={!fieldErrors.subject ? `${subject.length}/${SUBJECT_MAX} characters` : undefined}
            placeholder="Brief summary of the issue"
          />

          <div className="grid grid-cols-1 gap-space-lg md:grid-cols-2">
            <SelectField label="Category" value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectField>
          </div>

          <fieldset className="flex flex-col gap-space-sm">
            <legend className="text-label-md uppercase tracking-wider text-secondary">Priority *</legend>
            <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-2 xl:grid-cols-4">
              {priorities.map((priority) => {
                const selected = priority.id === priorityId
                return (
                  <label
                    key={priority.id}
                    className={cn(
                      'relative flex cursor-pointer flex-col gap-1 rounded-lg p-space-md transition-all',
                      selected ? 'bg-primary-fixed text-on-primary-fixed ring-2 ring-primary shadow-md' : 'bg-surface-container-low hover:bg-surface-container',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-title-sm font-bold">
                        <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: priority.color }} />
                        {priority.name}
                      </span>
                      <input
                        type="radio"
                        name="priority"
                        aria-label={priority.name}
                        checked={selected}
                        onChange={() => setPriorityId(priority.id)}
                        className="accent-primary"
                      />
                    </div>
                  </label>
                )
              })}
            </div>
            {fieldErrors.priority_id && <p className="text-body-sm text-error">{fieldErrors.priority_id}</p>}
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="ticket-description" className="text-label-md uppercase tracking-wider text-secondary">
                Description *
              </label>
              <span className="text-code-sm text-secondary">
                {description.length}/{DESCRIPTION_MAX}
              </span>
            </div>
            <textarea
              id="ticket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
              rows={8}
              placeholder="Describe the issue in detail — steps to reproduce, error messages, impact…"
              className="w-full resize-y rounded-lg bg-surface-container-lowest p-space-md font-body-md text-body-md text-on-surface shadow-sm focus:ring-2 focus:ring-primary focus:outline-none"
            />
            {fieldErrors.description && <p className="text-body-sm text-error">{fieldErrors.description}</p>}
          </div>

          <AttachmentPicker files={files} onChange={setFiles} disabled={isSubmitting} />
        </div>

        <div className="flex items-center justify-end gap-space-sm">
          <Button type="button" variant="ghost" onClick={() => navigate(ROUTES.tickets)}>
            Cancel
          </Button>
          <Button type="submit" leadingIcon="send" isLoading={isSubmitting} disabled={lookupsLoading}>
            Submit Ticket
          </Button>
        </div>
      </form>
    </div>
  )
}
