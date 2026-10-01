export interface CategoryBarRow {
  label: string
  count: number
  /** Hex color — reuses the record's own configured color (status/priority) where one exists, so reports stay visually consistent with the rest of the app. */
  color: string
}

export interface CategoryBarListProps {
  rows: CategoryBarRow[]
  emptyLabel?: string
}

/** Horizontal bar list for a single magnitude-by-category breakdown. Each bar carries its own direct label, so no separate legend is needed. */
export function CategoryBarList({ rows, emptyLabel = 'No data yet.' }: CategoryBarListProps) {
  if (rows.length === 0) {
    return <p className="py-space-md text-center text-body-sm text-on-surface-variant">{emptyLabel}</p>
  }

  const maxValue = Math.max(...rows.map((r) => r.count), 1)

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.label} title={`${row.label}: ${row.count}`}>
          <div className="mb-1 flex justify-between text-label-sm">
            <span className="text-on-surface">{row.label}</span>
            <span className="font-bold text-on-surface">{row.count}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(row.count / maxValue) * 100}%`, backgroundColor: row.color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
