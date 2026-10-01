import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useToast } from '@/components/feedback/ToastProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { PriorityBadge } from '@/components/ui/PriorityBadge'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { DataTableColumn } from '@/components/tables/DataTable'
import { DataTable } from '@/components/tables/DataTable'
import { Pagination } from '@/components/tables/Pagination'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ticketsApi } from '@/features/tickets/api/ticketsApi'
import { SlaCountdown } from '@/features/tickets/components/SlaCountdown'
import { TicketFiltersBar } from '@/features/tickets/components/TicketFiltersBar'
import { useTicketLookups } from '@/features/tickets/hooks/useTicketLookups'
import { useTickets } from '@/features/tickets/hooks/useTickets'
import { formatDateTime, formatRelativeTime } from '@/utils/datetime'
import type { Ticket, TicketFilters } from '@/types/ticket'

const PER_PAGE = 20

export interface TicketsListPageProps {
  /** 'mine' locks the list to tickets assigned to the signed-in staff member — used by the "My Tickets" nav item. */
  scope?: 'all' | 'mine'
}

export function TicketsListPage({ scope = 'all' }: TicketsListPageProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const [filters, setFilters] = useState<TicketFilters>({
    page: 1,
    perPage: PER_PAGE,
    sort: '-created_at',
    assigneeId: scope === 'mine' ? user?.id : undefined,
  })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkActing, setIsBulkActing] = useState(false)

  const { tickets, meta, isLoading, error, refetch } = useTickets(filters)
  const { statuses, priorities, departments } = useTicketLookups()

  const selectedTickets = useMemo(() => tickets.filter((t) => selectedIds.has(t.id)), [tickets, selectedIds])

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll(selected: boolean) {
    setSelectedIds(selected ? new Set(tickets.map((t) => t.id)) : new Set())
  }

  async function handleBulkClose() {
    setIsBulkActing(true)
    // allSettled (not all): one ticket failing — already closed, outside
    // the caller's department, etc. — must not silently swallow the
    // outcome of every other ticket in the batch, nor leave the user with
    // no idea anything happened at all (previously a bare Promise.all with
    // no catch produced an unhandled rejection and no feedback whatsoever;
    // QA finding, 2026-10-01).
    try {
      const results = await Promise.allSettled(selectedTickets.map((t) => ticketsApi.close(t.id)))
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      const succeededCount = results.length - failed.length

      if (failed.length === 0) {
        toast.success('Tickets Closed', `${succeededCount} ticket${succeededCount === 1 ? '' : 's'} closed.`)
      } else if (succeededCount === 0) {
        toast.error('Bulk Close Failed', `None of the ${failed.length} selected ticket(s) could be closed.`)
      } else {
        toast.warning(
          'Bulk Close Partially Completed',
          `${succeededCount} ticket${succeededCount === 1 ? '' : 's'} closed, ${failed.length} failed.`,
        )
      }

      setSelectedIds(new Set())
      refetch()
    } finally {
      setIsBulkActing(false)
    }
  }

  const columns: DataTableColumn<Ticket>[] = [
    {
      key: 'number',
      header: 'Ticket #',
      className: 'whitespace-nowrap font-code-sm text-code-sm font-semibold text-primary',
      render: (t) => (
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-6 w-1.5 rounded-full" style={{ backgroundColor: t.priority?.color ?? '#94A3B8' }} />
          <span>{t.ticketNumber}</span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (t) => {
        const name = t.customer?.user?.name ?? t.customer?.companyName ?? '—'
        return (
          <div className="flex items-center gap-2.5">
            <Avatar name={name} src={t.customer?.user?.avatarPath} size={28} />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-title-sm leading-tight font-semibold">{name}</span>
              {t.customer?.companyName && <span className="truncate text-[11px] text-secondary">{t.customer.companyName}</span>}
            </div>
          </div>
        )
      },
    },
    {
      key: 'subject',
      header: 'Subject & Category',
      className: 'min-w-[260px]',
      render: (t) => (
        <div className="flex max-w-sm flex-col gap-1">
          <span className="truncate text-title-sm font-bold text-on-surface">{t.subject}</span>
          {t.category && (
            <span className="w-fit rounded bg-surface-container px-1.5 py-0.5 text-[10px] text-secondary uppercase tracking-wider">
              {t.category.name}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Dept',
      className: 'whitespace-nowrap',
      render: (t) => (t.department ? <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[11px] font-bold">{t.department.name}</span> : '—'),
    },
    ...(scope === 'mine'
      ? []
      : [
          {
            key: 'assignee',
            header: 'Assignee',
            render: (t: Ticket) =>
              t.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar name={t.assignee.name} src={t.assignee.avatarPath} size={24} />
                  <span className="truncate text-title-sm">{t.assignee.name}</span>
                </div>
              ) : (
                <span className="text-secondary">Unassigned</span>
              ),
          } satisfies DataTableColumn<Ticket>,
        ]),
    { key: 'priority', header: 'Priority', className: 'whitespace-nowrap', render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: 'status', header: 'Status', className: 'whitespace-nowrap', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'sla', header: 'SLA Target', className: 'whitespace-nowrap', render: (t) => <SlaCountdown sla={t.sla} /> },
    { key: 'created', header: 'Created', className: 'text-[12px] whitespace-nowrap text-secondary', render: (t) => formatDateTime(t.createdAt) },
    { key: 'updated', header: 'Updated', className: 'text-[12px] whitespace-nowrap text-secondary', render: (t) => formatRelativeTime(t.updatedAt) },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right whitespace-nowrap',
      render: (t) => (
        <IconButton icon="visibility" label="View ticket" onClick={() => navigate(ROUTES.ticketDetails(t.id))} />
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={
          scope === 'mine'
            ? [{ label: 'Workspace' }, { label: 'My Tickets' }]
            : [{ label: 'Workspace' }, { label: 'Tickets' }, { label: 'All Tickets' }]
        }
        title={scope === 'mine' ? 'My Tickets' : 'Tickets Directory'}
        meta={
          meta && (
            <span className="flex items-center gap-1.5 rounded-full bg-surface-container-high px-2 py-0.5 text-code-sm text-on-surface">
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
              {meta.total} {scope === 'mine' ? 'Assigned to You' : 'Total In-Scope'}
            </span>
          )
        }
        actions={
          <Link
            to={ROUTES.createTicket}
            className="inline-flex h-9 items-center gap-space-sm rounded-lg bg-primary px-space-md text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            <Icon name="add" size={20} />
            Create Ticket
          </Link>
        }
      />

      <div className="px-gutter-lg">
        <TicketFiltersBar filters={filters} onChange={setFilters} statuses={statuses} priorities={priorities} departments={departments} />
      </div>

      {selectedIds.size > 0 && (
        <div className="px-gutter-lg">
          <div className="flex flex-wrap items-center justify-between gap-space-md rounded-xl bg-inverse-surface p-space-md text-inverse-on-surface shadow-md">
            <div className="flex items-center gap-space-md">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-code-sm text-code-sm font-bold text-on-primary">
                {selectedIds.size}
              </div>
              <span className="text-title-sm font-semibold">{selectedIds.size} ticket{selectedIds.size === 1 ? '' : 's'} selected</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isBulkActing}
                onClick={handleBulkClose}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-surface-container-high/15 px-2.5 text-title-sm transition-colors hover:bg-error hover:text-on-error disabled:opacity-50"
              >
                <Icon name="check_circle" size={16} />
                Close Selected
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="ml-1 h-8 rounded-lg px-2 text-label-sm text-secondary-fixed uppercase tracking-wider hover:text-inverse-on-surface"
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-gutter-lg">
        <DataTable
          columns={columns}
          rows={tickets}
          getRowId={(t) => t.id}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          emptyTitle="No tickets found"
          emptyDescription="Try adjusting your filters."
          selectable
          selectedIds={selectedIds}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
        />
        {meta && <Pagination meta={meta} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />}
      </div>
    </div>
  )
}
