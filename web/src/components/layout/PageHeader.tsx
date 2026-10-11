import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { Icon } from '@/components/ui/Icon'

export interface Breadcrumb {
  label: string
  to?: string
}

export interface PageHeaderProps {
  breadcrumbs: Breadcrumb[]
  title: string
  meta?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ breadcrumbs, title, meta, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-space-md px-gutter-lg pt-space-lg pb-space-md md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-label-sm uppercase tracking-wider text-secondary">
          {breadcrumbs.map((crumb, index) => (
            <span key={crumb.label} className="inline-flex min-w-0 items-center gap-2">
              {index > 0 && <Icon name="chevron_right" size={14} />}
              {crumb.to ? (
                <Link to={crumb.to} className="transition-colors hover:text-on-surface">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-semibold text-on-surface">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
        <div className="flex flex-wrap items-baseline gap-space-md">
          <h1 className="break-words text-headline-lg tracking-tight text-on-surface">{title}</h1>
          {meta}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-space-sm">{actions}</div>}
    </div>
  )
}
