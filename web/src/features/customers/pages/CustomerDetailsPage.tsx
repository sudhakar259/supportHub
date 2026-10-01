import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { customersApi } from '@/features/customers/api/customersApi'
import { EditCustomerModal } from '@/features/customers/components/EditCustomerModal'
import { TicketRow } from '@/features/tickets/components/TicketRow'
import { useTickets } from '@/features/tickets/hooks/useTickets'
import type { Customer } from '@/types/customer'

export function CustomerDetailsPage() {
  const { customerId } = useParams<{ customerId: string }>()
  const id = Number(customerId)

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const { tickets, meta: ticketsMeta, isLoading: ticketsLoading } = useTickets({ customerId: id, perPage: 10, sort: '-created_at' })

  useEffect(() => {
    if (!id) return
    setIsLoading(true)
    customersApi
      .get(id)
      .then(setCustomer)
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) return <LoadingState label="Loading customer…" />
  if (error || !customer) return <ErrorState description={error?.message ?? 'Customer not found.'} />

  const name = customer.user?.name ?? customer.companyName ?? `Customer #${customer.id}`

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Workspace' }, { label: 'Customers', to: ROUTES.customers }, { label: name }]}
        title={name}
        meta={
          <div className="flex items-center gap-space-sm">
            <Badge tone={customer.customerType === 'vip' ? 'primary' : customer.customerType === 'business' ? 'secondary' : 'neutral'}>
              {customer.customerType}
            </Badge>
            {customer.user?.isActive ? <Badge tone="tertiary">Active</Badge> : <Badge tone="danger">Inactive</Badge>}
          </div>
        }
        actions={
          <Button variant="ghost" leadingIcon="edit" onClick={() => setIsEditOpen(true)}>
            Edit Customer
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-space-md px-gutter-lg sm:grid-cols-3">
        <div className="flex items-center gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm sm:col-span-1">
          <Avatar name={name} src={customer.user?.avatarPath} size={56} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-title-md font-bold text-on-surface">{name}</span>
            {customer.companyName && <span className="truncate text-body-sm text-on-surface-variant">{customer.companyName}</span>}
          </div>
        </div>
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <span className="text-label-sm uppercase text-secondary">Contact</span>
          <div className="mt-1 flex flex-col gap-1 text-body-sm">
            {customer.user?.email && (
              <span className="flex items-center gap-1.5 text-on-surface">
                <Icon name="mail" size={14} className="text-secondary" />
                {customer.user.email}
              </span>
            )}
            {customer.phone && (
              <span className="flex items-center gap-1.5 text-on-surface">
                <Icon name="call" size={14} className="text-secondary" />
                {customer.phone}
              </span>
            )}
          </div>
        </div>
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <span className="text-label-sm uppercase text-secondary">Total Tickets</span>
          <div className="text-headline-md text-on-surface">{ticketsMeta?.total ?? 0}</div>
        </div>
      </div>

      <div className="px-gutter-lg">
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <h2 className="mb-space-sm text-title-md font-bold text-on-surface">Ticket History</h2>
          {ticketsLoading ? (
            <LoadingState label="Loading tickets…" />
          ) : tickets.length === 0 ? (
            <p className="py-space-md text-center text-body-sm text-on-surface-variant">No tickets from this customer yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-surface-container-low">
              {tickets.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </div>
      </div>

      <EditCustomerModal
        customer={isEditOpen ? customer : null}
        onClose={() => setIsEditOpen(false)}
        onUpdated={(updated) => {
          setCustomer(updated)
          setIsEditOpen(false)
        }}
      />
    </div>
  )
}
