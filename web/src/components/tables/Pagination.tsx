import { Icon } from '@/components/ui/Icon'
import type { PaginationMeta } from '@/types/pagination'

export interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  const { currentPage, lastPage, perPage, total } = meta
  if (total === 0) return null

  const from = (currentPage - 1) * perPage + 1
  const to = Math.min(currentPage * perPage, total)

  return (
    <div className="flex items-center justify-between px-gutter-lg py-space-md text-body-sm text-on-surface-variant">
      <span>
        Showing <span className="font-semibold text-on-surface">{from}</span>–<span className="font-semibold text-on-surface">{to}</span>{' '}
        of <span className="font-semibold text-on-surface">{total}</span>
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-surface-container disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Previous page"
        >
          <Icon name="chevron_left" size={18} />
        </button>
        <span className="px-space-sm text-title-sm text-on-surface">
          {currentPage} / {lastPage}
        </span>
        <button
          type="button"
          disabled={currentPage >= lastPage}
          onClick={() => onPageChange(currentPage + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-surface-container disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Next page"
        >
          <Icon name="chevron_right" size={18} />
        </button>
      </div>
    </div>
  )
}
