import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import type { DataTableColumn } from '@/components/tables/DataTable'
import { DataTable } from '@/components/tables/DataTable'
import { Pagination } from '@/components/tables/Pagination'
import { Badge } from '@/components/ui/Badge'
import type { BadgeTone } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/IconButton'
import { SelectField } from '@/components/ui/SelectField'
import { platformTenantsApi } from '@/features/platform/api/platformTenantsApi'
import { useAdminTenants } from '@/features/platform/hooks/useAdminTenants'
import type { AdminTenant, AdminTenantFilters, TenantStatus } from '@/features/platform/types'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatPriceCents } from '@/utils/money'

const STATUS_TONE: Record<TenantStatus, BadgeTone> = {
  trial: 'secondary',
  active: 'tertiary',
  suspended: 'danger',
  cancelled: 'neutral',
}

export function TenantsListPage() {
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<AdminTenantFilters>({
    page: 1,
    perPage: 20,
    sort: '-created_at',
    status: (searchParams.get('status') as TenantStatus) || undefined,
  })
  const [nameInput, setNameInput] = useState('')
  const debouncedName = useDebouncedValue(nameInput, 300)
  useEffect(() => {
    setFilters((f) => (f.name === debouncedName ? f : { ...f, name: debouncedName || undefined, page: 1 }))
  }, [debouncedName])

  const { tenants, meta, isLoading, error, refetch } = useAdminTenants(filters)
  const [suspending, setSuspending] = useState<AdminTenant | null>(null)
  const [activating, setActivating] = useState<AdminTenant | null>(null)

  const columns: DataTableColumn<AdminTenant>[] = [
    {
      key: 'name',
      header: 'Tenant',
      render: (t) => (
        <Link to={ROUTES.platformTenantDetails(t.id)} className="font-bold text-on-surface hover:text-primary">
          {t.name}
        </Link>
      ),
    },
    { key: 'slug', header: 'Slug', render: (t) => <span className="font-code-sm text-code-sm text-secondary">{t.slug}</span> },
    {
      key: 'plan',
      header: 'Plan',
      render: (t) =>
        t.subscription ? (
          <span>
            {t.subscription.plan.name} <span className="text-secondary">({formatPriceCents(t.subscription.plan.priceCents, t.subscription.plan.currency)})</span>
          </span>
        ) : (
          <span className="text-secondary">—</span>
        ),
    },
    { key: 'status', header: 'Status', render: (t) => <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge> },
    { key: 'users', header: 'Users', render: (t) => t.usersCount },
    { key: 'customers', header: 'Customers', render: (t) => t.customersCount },
    { key: 'tickets', header: 'Tickets', render: (t) => t.ticketsCount },
    {
      key: 'created',
      header: 'Created',
      className: 'text-[12px] text-secondary whitespace-nowrap',
      render: (t) => new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right whitespace-nowrap',
      render: (t) =>
        t.status === 'suspended' ? (
          <IconButton icon="play_circle" label="Activate tenant" onClick={() => setActivating(t)} />
        ) : (
          <IconButton icon="block" label="Suspend tenant" onClick={() => setSuspending(t)} />
        ),
    },
  ]

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Platform Admin' }, { label: 'Tenants' }]}
        title="Tenants"
        meta={meta && <span className="rounded bg-surface-container px-2 py-0.5 text-code-sm text-secondary">{meta.total} total</span>}
      />

      <div className="px-gutter-lg">
        <div className="mb-space-md flex flex-wrap items-center gap-space-sm">
          <input
            type="text"
            placeholder="Search by name…"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="h-9 w-64 rounded-lg bg-surface-container-lowest px-space-md text-body-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <SelectField
            value={filters.status ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, status: (e.target.value as TenantStatus) || undefined, page: 1 }))}
            containerClassName="w-48"
          >
            <option value="">All Statuses</option>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </SelectField>
        </div>

        <DataTable columns={columns} rows={tenants} getRowId={(t) => String(t.id)} isLoading={isLoading} error={error} onRetry={refetch} emptyTitle="No tenants found" />
        {meta && <Pagination meta={meta} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />}
      </div>

      {suspending && (
        <ConfirmDialog
          isOpen
          onClose={() => setSuspending(null)}
          title="Suspend Tenant"
          description={`This immediately blocks every user of "${suspending.name}" from signing in. You can reverse this anytime by activating the tenant again.`}
          confirmLabel="Suspend"
          successMessage={`"${suspending.name}" suspended.`}
          onConfirm={async () => {
            await platformTenantsApi.suspend(suspending.id)
            refetch()
          }}
        />
      )}
      {activating && (
        <ConfirmDialog
          isOpen
          onClose={() => setActivating(null)}
          title="Activate Tenant"
          description={`This restores sign-in access for every user of "${activating.name}".`}
          confirmLabel="Activate"
          confirmVariant="primary"
          successMessage={`"${activating.name}" activated.`}
          onConfirm={async () => {
            await platformTenantsApi.activate(activating.id)
            refetch()
          }}
        />
      )}
    </div>
  )
}
