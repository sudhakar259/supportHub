import { useEffect, useMemo, useState } from 'react'

import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageHeader } from '@/components/layout/PageHeader'
import { lookupsApi } from '@/features/tickets/api/lookupsApi'
import { TicketsCsvExport } from '@/features/reports/components/TicketsCsvExport'
import { reportsApi } from '@/features/reports/api/reportsApi'
import { CategoryBarList } from '@/features/reports/components/CategoryBarList'
import { SlaComplianceTiles } from '@/features/reports/components/SlaComplianceTiles'
import { fetchOrDefault } from '@/utils/fetchOrDefault'
import type { AgentPerformanceEntry, SlaComplianceReport, TicketSummaryReport } from '@/types/report'
import type { TicketPriority, TicketStatus } from '@/types/ticket'

const DEPARTMENT_PALETTE = ['var(--color-primary)', 'var(--color-brand-accent)', 'var(--color-info)', 'var(--color-success)', 'var(--color-secondary)', 'var(--color-warning)']
const AGENT_BAR_COLOR = 'var(--color-primary)'

export function ReportsPage() {
  const [summary, setSummary] = useState<TicketSummaryReport | null>(null)
  const [slaCompliance, setSlaCompliance] = useState<SlaComplianceReport | null>(null)
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformanceEntry[]>([])
  const [statuses, setStatuses] = useState<TicketStatus[]>([])
  const [priorities, setPriorities] = useState<TicketPriority[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    setIsLoading(true)
    Promise.all([
      reportsApi.ticketSummary(),
      reportsApi.slaCompliance(),
      reportsApi.agentPerformance(),
      fetchOrDefault(lookupsApi.listStatuses(), []),
      fetchOrDefault(lookupsApi.listPriorities(), []),
    ])
      .then(([ticketSummary, sla, agents, statusList, priorityList]) => {
        setSummary(ticketSummary)
        setSlaCompliance(sla)
        setAgentPerformance(agents)
        setStatuses(statusList)
        setPriorities(priorityList)
      })
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false))
  }, [reloadToken])

  const statusRows = useMemo(
    () =>
      (summary?.byStatus ?? []).map((row) => ({
        label: row.status,
        count: row.count,
        color: statuses.find((s) => s.name === row.status)?.color ?? 'var(--color-secondary)',
      })),
    [summary, statuses],
  )

  const priorityRows = useMemo(
    () =>
      (summary?.byPriority ?? []).map((row) => ({
        label: row.priority,
        count: row.count,
        color: priorities.find((p) => p.name === row.priority)?.color ?? 'var(--color-secondary)',
      })),
    [summary, priorities],
  )

  const departmentRows = useMemo(
    () =>
      (summary?.byDepartment ?? []).map((row, index) => ({
        label: row.department,
        count: row.count,
        color: DEPARTMENT_PALETTE[index % DEPARTMENT_PALETTE.length],
      })),
    [summary],
  )

  const agentRows = useMemo(
    () => agentPerformance.map((a) => ({ label: a.agentName, count: a.resolvedCount, color: AGENT_BAR_COLOR })),
    [agentPerformance],
  )

  const refetch = () => setReloadToken((t) => t + 1)

  if (isLoading) return <LoadingState label="Loading reports…" />
  if (error || !summary || !slaCompliance) return <ErrorState description={error?.message ?? 'Failed to load reports.'} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Workspace' }, { label: 'Reports' }]}
        title="Reports & Analytics"
        meta={<span className="rounded bg-surface-container px-2 py-0.5 text-code-sm text-secondary">{summary.totalTickets} tickets total</span>}
        actions={<TicketsCsvExport />}
      />

      <div className="flex flex-col gap-space-lg px-gutter-lg">
        <section>
          <h2 className="mb-space-sm text-title-md font-bold text-on-surface">SLA Compliance</h2>
          <SlaComplianceTiles report={slaCompliance} />
        </section>

        <section className="grid grid-cols-1 gap-space-md xl:grid-cols-3">
          <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
            <h3 className="mb-space-sm text-title-sm font-bold text-on-surface">Tickets by Status</h3>
            <CategoryBarList rows={statusRows} />
          </div>
          <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
            <h3 className="mb-space-sm text-title-sm font-bold text-on-surface">Tickets by Priority</h3>
            <CategoryBarList rows={priorityRows} />
          </div>
          <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
            <h3 className="mb-space-sm text-title-sm font-bold text-on-surface">Tickets by Department</h3>
            <CategoryBarList rows={departmentRows} emptyLabel="No department-assigned tickets yet." />
          </div>
        </section>

        <section className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          <h2 className="mb-space-sm text-title-md font-bold text-on-surface">Agent Performance (Resolved Tickets)</h2>
          <CategoryBarList rows={agentRows} emptyLabel="No resolved tickets with an assignee yet." />
        </section>
      </div>
    </div>
  )
}
