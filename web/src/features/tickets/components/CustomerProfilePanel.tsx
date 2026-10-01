import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import type { Customer } from '@/types/customer'

export interface CustomerProfilePanelProps {
  customer: Customer | null
}

export function CustomerProfilePanel({ customer }: CustomerProfilePanelProps) {
  if (!customer) {
    return (
      <section className="rounded bg-surface-container-lowest p-space-md text-body-sm text-on-surface-variant shadow-sm">
        No requester on file for this ticket.
      </section>
    )
  }

  const name = customer.user?.name ?? customer.companyName ?? 'Unknown requester'

  return (
    <section className="flex flex-col gap-space-sm rounded bg-surface-container-lowest p-space-md shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-label-sm font-bold text-secondary uppercase tracking-wider">Requester Profile</span>
        <Link to={ROUTES.customers} className="flex items-center gap-0.5 text-label-sm text-primary hover:underline">
          Customer 360
          <Icon name="open_in_new" size={14} />
        </Link>
      </div>
      <div className="flex items-center gap-space-sm pt-1">
        <Avatar name={name} src={customer.user?.avatarPath} size={48} />
        <div className="flex flex-col">
          <span className="text-title-md font-bold text-on-surface">{name}</span>
          {customer.companyName && <span className="text-label-sm font-semibold text-primary">{customer.companyName}</span>}
          <span className="text-label-sm text-secondary uppercase">{customer.customerType}</span>
        </div>
      </div>
      <div className="flex flex-col gap-1 pt-2 text-body-sm text-secondary">
        {customer.user?.email && (
          <div className="flex items-center gap-2">
            <Icon name="mail" size={16} className="text-outline" />
            <span className="text-on-surface select-all">{customer.user.email}</span>
          </div>
        )}
        {customer.phone && (
          <div className="flex items-center gap-2">
            <Icon name="call" size={16} className="text-outline" />
            <span className="text-on-surface">{customer.phone}</span>
          </div>
        )}
        {customer.timezone && (
          <div className="flex items-center gap-2">
            <Icon name="schedule" size={16} className="text-outline" />
            <span>{customer.timezone}</span>
          </div>
        )}
      </div>
    </section>
  )
}
