import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PageHeader } from '@/components/layout/PageHeader'
import { ErrorState } from '@/components/feedback/ErrorState'
import { Icon } from '@/components/ui/Icon'
import { LoadingState } from '@/components/feedback/LoadingState'
import { MetricCard } from '@/features/tickets/components/MetricCard'
import { TicketCard } from '@/features/tickets/components/TicketCard'
import { TicketRow } from '@/features/tickets/components/TicketRow'
import { useTickets } from '@/features/tickets/hooks/useTickets'
import type { Ticket } from '@/types/ticket'

const DEPARTMENT_BAR_COLORS = ['bg-primary', 'bg-secondary', 'bg-tertiary', 'bg-surface-container-highest']

function groupByDepartment(tickets: Ticket[]) {
  const counts = new Map<string, number>()
  for (const ticket of tickets) {
    const name = ticket.department?.name ?? 'Unassigned'
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
}

/**
 * Operations Center dashboard. There is no dedicated stats endpoint yet, so
 * metrics are computed client-side from the most recent 100 accessible
 * tickets (`meta.total` from the unfiltered query is exact; per-status/
 * per-department breakdowns are a reasonable approximation until a real
 * aggregates endpoint exists).
 */
export function TicketsDashboardPage() {
  const { tickets, meta, isLoading, error, refetch } = useTickets({ perPage: 100, sort: '-created_at' })

  const statusGroups = useMemo(() => {
    const map = new Map<number, { name: string; color: string; count: number }>()
    for (const ticket of tickets) {
      if (!ticket.status) continue
      const existing = map.get(ticket.status.id)
      if (existing) existing.count += 1
      else map.set(ticket.status.id, { name: ticket.status.name, color: ticket.status.color, count: 1 })
    }
    return [...map.values()]
  }, [tickets])

  const urgentTickets = useMemo(
    () =>
      tickets
        .filter((t) => t.sla?.status === 'breached' || (t.priority?.level ?? 0) >= 3)
        .sort((a, b) => (b.priority?.level ?? 0) - (a.priority?.level ?? 0))
        .slice(0, 4),
    [tickets],
  )

  const recentTickets = useMemo(() => tickets.slice(0, 7), [tickets])
  const breachedCount = useMemo(() => tickets.filter((t) => t.sla?.status === 'breached').length, [tickets])
  const departmentGroups = useMemo(() => groupByDepartment(tickets), [tickets])
  const maxDepartmentCount = departmentGroups[0]?.[1] ?? 1

  if (isLoading) return <LoadingState label="Loading operations center…" />
  if (error) return <ErrorState description={error.message} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-space-lg pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Workspace' }, { label: 'Tickets' }, { label: 'Dashboard' }]}
        title="Operations Center"
        meta={
          meta && (
            <span className="rounded bg-surface-container px-2 py-0.5 text-code-sm text-secondary shadow-sm">
              {meta.total} tickets in scope
            </span>
          )
        }
        actions={
          <Link
            to={ROUTES.createTicket}
            className="inline-flex h-9 items-center gap-space-sm rounded bg-primary px-space-md text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            <Icon name="add" size={18} />
            Create Ticket
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-space-md px-gutter-lg sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statusGroups.map((status) => (
          <MetricCard
            key={status.name}
            label={status.name}
            value={status.count}
            icon="confirmation_number"
            tone={status.name.toLowerCase().includes('escalat') ? 'danger' : 'default'}
          />
        ))}
      </div>

      {breachedCount > 0 && (
        <div className="px-gutter-lg">
          <div className="relative flex flex-col items-center justify-between gap-space-md overflow-hidden rounded-xl bg-surface-container-lowest p-space-md shadow-sm sm:flex-row">
            <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-error" />
            <div className="flex items-center gap-space-md pl-2">
              <div className="flex items-center justify-center rounded-lg bg-error-container p-2.5 text-on-error-container">
                <Icon name="crisis_alert" size={24} />
              </div>
              <div>
                <span className="text-title-sm text-error">CRITICAL SLA ALERT</span>
                <p className="mt-0.5 text-body-md text-on-surface">
                  <span className="font-bold text-error">{breachedCount}</span> ticket{breachedCount === 1 ? '' : 's'} currently
                  breaching SLA.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-space-lg px-gutter-lg xl:grid-cols-12">
        <div className="flex flex-col gap-space-md xl:col-span-7">
          <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
            <div className="mb-space-sm flex items-center justify-between pb-space-sm">
              <div className="flex items-center gap-2">
                <Icon name="local_fire_department" size={20} className="text-error" />
                <h2 className="text-title-md text-on-surface">High Priority &amp; SLA Warnings</h2>
                <span className="rounded-full bg-error-container px-2 py-0.5 text-label-sm font-bold text-on-error-container">
                  {urgentTickets.length} Active
                </span>
              </div>
            </div>
            {urgentTickets.length === 0 ? (
              <p className="py-space-md text-center text-body-sm text-on-surface-variant">No urgent tickets right now.</p>
            ) : (
              <div className="flex flex-col gap-space-sm">
                {urgentTickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
            <div className="mb-space-sm flex items-center justify-between">
              <span className="text-title-sm font-bold text-on-surface">Queue Distribution</span>
              <span className="text-label-sm text-secondary uppercase">By Dept</span>
            </div>
            <div className="space-y-2.5">
              {departmentGroups.map(([name, count], index) => (
                <div key={name}>
                  <div className="mb-1 flex justify-between text-label-sm">
                    <span className="text-on-surface">{name}</span>
                    <span className="font-bold text-on-surface">{count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                    <div
                      className={`h-full rounded-full ${DEPARTMENT_BAR_COLORS[index % DEPARTMENT_BAR_COLORS.length]}`}
                      style={{ width: `${(count / maxDepartmentCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col xl:col-span-5">
          <div className="flex flex-1 flex-col rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
            <div className="mb-space-md flex items-center justify-between border-b border-surface-container pb-space-sm">
              <span className="text-title-sm font-bold text-primary">Recently Updated</span>
            </div>
            <div className="flex flex-1 flex-col gap-space-xs">
              {recentTickets.length === 0 ? (
                <p className="py-space-md text-center text-body-sm text-on-surface-variant">No tickets yet.</p>
              ) : (
                recentTickets.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />)
              )}
            </div>
            <div className="mt-auto pt-space-md">
              <Link
                to={ROUTES.tickets}
                className="flex w-full items-center justify-center gap-1 rounded-lg bg-surface-container-low py-2 text-title-sm text-on-surface transition-colors hover:bg-surface-container"
              >
                <span>View All Tickets</span>
                <Icon name="arrow_forward" size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
