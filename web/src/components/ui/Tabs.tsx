import { cn } from '@/utils/cn'

export interface TabItem {
  key: string
  label: string
  count?: number
}

export interface TabsProps {
  items: TabItem[]
  activeKey: string
  onChange: (key: string) => void
  className?: string
}

export function Tabs({ items, activeKey, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto', className)} role="tablist">
      {items.map((item) => {
        const isActive = item.key === activeKey
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.key)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-title-sm transition-colors',
              isActive ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface',
            )}
          >
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[11px] font-semibold',
                  isActive ? 'bg-surface-container text-secondary' : 'bg-surface-container-high text-secondary',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
