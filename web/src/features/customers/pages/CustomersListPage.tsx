import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import type { DataTableColumn } from '@/components/tables/DataTable'
import { DataTable } from '@/components/tables/DataTable'
import { Pagination } from '@/components/tables/Pagination'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { useToast } from '@/components/feedback/ToastProvider'
import { customersApi } from '@/features/customers/api/customersApi'
import { CreateCustomerModal } from '@/features/customers/components/CreateCustomerModal'
import { EditCustomerModal } from '@/features/customers/components/EditCustomerModal'
import { useCustomers } from '@/features/customers/hooks/useCustomers'
import type { CustomerFilters } from '@/features/customers/types'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { hasPermission } from '@/types/user'
import type { Customer } from '@/types/customer'

const CUSTOMER_TYPE_TONE: Record<string, 'secondary' | 'primary' | 'neutral'> = {
  vip: 'primary',
  business: 'secondary',
  individual: 'neutral',
}

export function CustomersListPage() {
  const { user } = useAuth()
  const canCreate = hasPermission(user, 'customers.create')
  const canExportCsv = hasPermission(user, 'customers.view')
  const toast = useToast()
  const canUpdate = hasPermission(user, 'customers.update')
  const canDelete = hasPermission(user, 'customers.delete')
  const [filters, setFilters] = useState<CustomerFilters>({ page: 1, perPage: 20, sort: '-created_at' })
  const [companyNameInput, setCompanyNameInput] = useState('')
  const debouncedCompanyName = useDebouncedValue(companyNameInput, 300)
  // Previously fired one API request per keystroke (QA finding, 2026-10-01).
  useEffect(() => {
    setFilters((f) => (f.companyName === debouncedCompanyName ? f : { ...f, companyName: debouncedCompanyName || undefined, page: 1 }))
  }, [debouncedCompanyName])
  const { customers, meta, isLoading, error, refetch } = useCustomers(filters)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)

  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'customer',
      header: 'Customer',
      render: (c) => {
        const name = c.user?.name ?? c.companyName ?? `Customer #${c.id}`
        return (
          <Link to={ROUTES.customerDetails(c.id)} className="flex items-center gap-2.5 hover:text-primary">
            <Avatar name={name} src={c.user?.avatarPath} size={32} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-title-sm font-semibold">{name}</span>
              {c.user?.email && <span className="truncate text-[11px] text-secondary">{c.user.email}</span>}
            </div>
          </Link>
        )
      },
    },
    { key: 'company', header: 'Company', render: (c) => c.companyName ?? <span className="text-secondary">—</span> },
    { key: 'phone', header: 'Phone', render: (c) => c.phone ?? <span className="text-secondary">—</span> },
    {
      key: 'type',
      header: 'Type',
      render: (c) => <Badge tone={CUSTOMER_TYPE_TONE[c.customerType] ?? 'neutral'}>{c.customerType}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (c.user?.isActive ? <Badge tone="tertiary">Active</Badge> : <Badge tone="danger">Inactive</Badge>),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right whitespace-nowrap',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
          {canUpdate && <IconButton icon="edit" label="Edit customer" onClick={() => setEditingCustomer(c)} />}
          {canDelete && <IconButton icon="delete" label="Delete customer" onClick={() => setDeletingCustomer(c)} />}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Workspace' }, { label: 'Customers' }]}
        title="Customers"
        meta={meta && <span className="rounded bg-surface-container px-2 py-0.5 text-code-sm text-secondary">{meta.total} total</span>}
        actions={
          <div className="flex flex-wrap items-center gap-space-xs">
            {canExportCsv && (
              <button
                type="button"
                onClick={() => customersApi.exportCsv().catch((err: Error) => toast.error('Export Failed', err.message))}
                className="inline-flex h-9 items-center gap-space-sm rounded bg-surface-container px-space-md text-title-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <Icon name="download" size={18} />
                Export CSV
              </button>
            )}
            {canCreate && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex h-9 items-center gap-space-sm rounded bg-primary px-space-md text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
            >
              <Icon name="person_add" size={18} />
              Create Customer
            </button>
            )}
          </div>
        }
      />

      <div className="px-gutter-lg">
        <div className="mb-space-md flex items-center gap-space-sm">
          <input
            type="text"
            placeholder="Search by company name…"
            value={companyNameInput}
            onChange={(e) => setCompanyNameInput(e.target.value)}
            className="h-9 w-64 rounded-lg bg-surface-container-lowest px-space-md text-body-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <DataTable columns={columns} rows={customers} getRowId={(c) => String(c.id)} isLoading={isLoading} error={error} onRetry={refetch} emptyTitle="No customers found" />
        {meta && <Pagination meta={meta} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />}
      </div>

      <CreateCustomerModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={refetch} />
      <EditCustomerModal customer={editingCustomer} onClose={() => setEditingCustomer(null)} onUpdated={refetch} />
      {deletingCustomer && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeletingCustomer(null)}
          title="Delete Customer"
          description={`Delete ${deletingCustomer.user?.name ?? 'this customer'}? Their tickets are retained for historical reporting.`}
          successMessage={`${deletingCustomer.user?.name ?? 'Customer'} deleted.`}
          onConfirm={async () => {
            await customersApi.destroy(deletingCustomer.id)
            refetch()
          }}
        />
      )}
    </div>
  )
}
