import { useEffect, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import type { DataTableColumn } from '@/components/tables/DataTable'
import { DataTable } from '@/components/tables/DataTable'
import { Pagination } from '@/components/tables/Pagination'
import { SelectField } from '@/components/ui/SelectField'
import { AuditLogDetailModal } from '@/features/reports/components/AuditLogDetailModal'
import { useAuditLogs } from '@/features/reports/hooks/useAuditLogs'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDateTime } from '@/utils/datetime'
import type { AuditLog, AuditLogFilters } from '@/types/auditLog'

/** Common auditable models — the API filters by full class name, so this maps a friendly label to it. */
const AUDITABLE_TYPES = [
  { label: 'Ticket', value: String.raw`App\Models\Ticket` },
  { label: 'User', value: String.raw`App\Models\User` },
  { label: 'Department', value: String.raw`App\Models\Department` },
  { label: 'Customer', value: String.raw`App\Models\Customer` },
  { label: 'Ticket Category', value: String.raw`App\Models\TicketCategory` },
  { label: 'SLA Policy', value: String.raw`App\Models\SlaPolicy` },
  { label: 'Ticket Routing Rule', value: String.raw`App\Models\TicketRoutingRule` },
]

export function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1, perPage: 25 })
  const [actionInput, setActionInput] = useState('')
  const debouncedAction = useDebouncedValue(actionInput, 300)
  // Previously fired one API request per keystroke (QA finding, 2026-10-01).
  useEffect(() => {
    setFilters((f) => (f.action === debouncedAction ? f : { ...f, action: debouncedAction || undefined, page: 1 }))
  }, [debouncedAction])
  const { logs, meta, isLoading, error, refetch } = useAuditLogs(filters)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const columns: DataTableColumn<AuditLog>[] = [
    { key: 'action', header: 'Action', className: 'font-code-sm text-code-sm text-primary', render: (l) => l.action },
    { key: 'actor', header: 'Actor', render: (l) => l.actor?.name ?? l.actorType ?? 'System' },
    {
      key: 'target',
      header: 'Target',
      render: (l) => (l.auditableType ? `${l.auditableType} #${l.auditableId}` : '—'),
    },
    { key: 'ip', header: 'IP Address', className: 'font-code-sm text-code-sm text-secondary', render: (l) => l.ipAddress ?? '—' },
    {
      key: 'created',
      header: 'Timestamp',
      className: 'whitespace-nowrap text-secondary text-body-sm',
      render: (l) => (l.createdAt ? formatDateTime(l.createdAt) : '—'),
    },
  ]

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader breadcrumbs={[{ label: 'Workspace' }, { label: 'Audit Logs' }]} title="Audit Logs" />

      <div className="px-gutter-lg">
        <div className="mb-space-md flex items-center gap-space-sm">
          <input
            type="text"
            placeholder="Filter by action, e.g. ticket.status_changed"
            value={actionInput}
            onChange={(e) => setActionInput(e.target.value)}
            className="h-9 w-80 rounded-lg bg-surface-container-lowest px-space-md text-body-sm text-on-surface shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <SelectField
            value={filters.auditableType ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, auditableType: e.target.value || undefined, page: 1 }))}
            containerClassName="w-auto"
            className="h-9"
          >
            <option value="">All Record Types</option>
            {AUDITABLE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </SelectField>
        </div>

        <DataTable
          columns={columns}
          rows={logs}
          getRowId={(l) => String(l.id)}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          emptyTitle="No audit log entries found"
          onRowClick={setSelectedLog}
        />
        {meta && <Pagination meta={meta} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />}
      </div>

      <AuditLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  )
}
