import { useEffect, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { SelectField } from '@/components/ui/SelectField'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { Department } from '@/types/department'
import type { TicketFilters, TicketPriority, TicketStatus } from '@/types/ticket'

export interface TicketFiltersBarProps {
  filters: TicketFilters
  onChange: (filters: TicketFilters) => void
  statuses: TicketStatus[]
  priorities: TicketPriority[]
  departments: Department[]
}

export function TicketFiltersBar({ filters, onChange, statuses, priorities, departments }: TicketFiltersBarProps) {
  function update(patch: Partial<TicketFilters>) {
    onChange({ ...filters, ...patch, page: 1 })
  }

  // Previously every keystroke triggered an immediate API request (QA
  // finding, 2026-10-01) — the input is kept locally responsive and only
  // propagated to `filters` (which drives the fetch) once typing pauses.
  const [searchInput, setSearchInput] = useState(filters.search ?? '')
  const debouncedSearch = useDebouncedValue(searchInput, 300)
  useEffect(() => {
    if (debouncedSearch !== (filters.search ?? '')) update({ search: debouncedSearch || undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])
  // Keeps the input in sync when filters are cleared externally (Reset Filters below).
  useEffect(() => {
    setSearchInput(filters.search ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search])

  const hasActiveFilters = Boolean(filters.search || filters.statusId || filters.priorityId || filters.departmentId || filters.slaStatus)

  return (
    <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
      <div className="grid grid-cols-1 items-center gap-space-sm xl:grid-cols-12">
        <div className="relative flex items-center xl:col-span-4">
          <Icon name="search" size={20} className="pointer-events-none absolute left-3 text-secondary" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search tickets by subject, TKT-#, keywords…"
            className="h-9 w-full rounded-lg bg-surface-container-low pr-3 pl-9 text-body-sm text-on-surface placeholder:text-secondary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 xl:col-span-8">
          <SelectField
            value={filters.statusId ?? ''}
            onChange={(e) => update({ statusId: e.target.value ? Number(e.target.value) : undefined })}
            containerClassName="w-auto"
            className="h-9"
          >
            <option value="">All Statuses</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            value={filters.priorityId ?? ''}
            onChange={(e) => update({ priorityId: e.target.value ? Number(e.target.value) : undefined })}
            containerClassName="w-auto"
            className="h-9"
          >
            <option value="">All Priorities</option>
            {priorities.map((priority) => (
              <option key={priority.id} value={priority.id}>
                {priority.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            value={filters.departmentId ?? ''}
            onChange={(e) => update({ departmentId: e.target.value ? Number(e.target.value) : undefined })}
            containerClassName="w-auto"
            className="h-9"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            value={filters.slaStatus ?? ''}
            onChange={(e) => update({ slaStatus: (e.target.value || undefined) as TicketFilters['slaStatus'] })}
            containerClassName="w-auto"
            className="h-9"
          >
            <option value="">All SLA</option>
            <option value="pending">Pending</option>
            <option value="met">Met</option>
            <option value="breached">Breached</option>
            <option value="paused">Paused</option>
          </SelectField>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => onChange({ page: 1, perPage: filters.perPage })}
              className="h-9 rounded-lg px-2.5 text-label-sm text-secondary uppercase tracking-wider transition-colors hover:bg-surface-container hover:text-on-surface"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
