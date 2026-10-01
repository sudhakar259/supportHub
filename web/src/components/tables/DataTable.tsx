import type { ReactNode } from 'react'

import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { cn } from '@/utils/cn'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
  headerClassName?: string
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string | undefined
  selectable?: boolean
  selectedIds?: Set<string>
  onToggleRow?: (id: string) => void
  onToggleAll?: (selected: boolean) => void
}

/** Generic sortable-ready data table shared by Tickets, Users, Customers, Departments, Audit logs, Reports. */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  isLoading = false,
  error = null,
  onRetry,
  emptyTitle = 'No results found',
  emptyDescription,
  onRowClick,
  rowClassName,
  selectable = false,
  selectedIds,
  onToggleRow,
  onToggleAll,
}: DataTableProps<T>) {
  const allSelected = selectable && rows.length > 0 && rows.every((row) => selectedIds?.has(getRowId(row)))

  return (
    <div className="overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="h-10 select-none bg-surface-container-low text-label-sm tracking-wider text-secondary uppercase">
              {selectable && (
                <th scope="col" className="w-12 pr-2 pl-space-md text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onToggleAll?.(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded accent-primary"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key} scope="col" className={cn('px-space-sm py-2', col.headerClassName)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-body-sm text-on-surface">
            {!isLoading &&
              !error &&
              rows.map((row) => {
                const id = getRowId(row)
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      'border-t border-surface-container-low transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-surface-container-low',
                      selectedIds?.has(id) && 'bg-primary-fixed/20 hover:bg-primary-fixed/30',
                      rowClassName?.(row),
                    )}
                  >
                    {selectable && (
                      <td className="py-3 pr-2 pl-space-md text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds?.has(id) ?? false}
                          onChange={() => onToggleRow?.(id)}
                          className="h-4 w-4 cursor-pointer rounded accent-primary"
                          aria-label="Select row"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={cn('px-space-sm py-3', col.className)}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>

      {isLoading && <LoadingState label="Loading…" />}
      {!isLoading && error && <ErrorState onRetry={onRetry} description={error.message} />}
      {!isLoading && !error && rows.length === 0 && <EmptyState title={emptyTitle} description={emptyDescription} />}
    </div>
  )
}
