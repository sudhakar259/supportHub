import { Link, useLocation } from 'react-router-dom'

import { Icon } from '@/components/ui/Icon'
import type { NavItem } from '@/components/navigation/nav-items'
import { NAV_SECTIONS } from '@/components/navigation/nav-items'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { hasPermission } from '@/types/user'
import type { User } from '@/types/user'
import { cn } from '@/utils/cn'

export interface SidebarProps {
  /** Rendered as a fixed overlay panel on small screens; omit the wrapper positioning on desktop. */
  variant?: 'desktop' | 'drawer'
  onNavigate?: () => void
}

/** UX-only gate (the API enforces the real authorization) so staff aren't shown links that will always 403 for their role. */
function canSeeNavItem(user: User | null, item: NavItem): boolean {
  if (!item.permission) return true
  const required = Array.isArray(item.permission) ? item.permission : [item.permission]
  return required.some((permission) => hasPermission(user, permission))
}

export function Sidebar({ variant = 'desktop', onNavigate }: SidebarProps) {
  const location = useLocation()
  const { user } = useAuth()

  return (
    <aside
      className={cn(
        'flex h-screen w-64 flex-col justify-between bg-inverse-surface',
        variant === 'desktop' ? 'fixed top-0 left-0 z-30 shadow-[0_1px_8px_rgba(0,0,0,0.04)]' : 'w-full max-w-xs',
      )}
    >
      <div className="flex h-full flex-col overflow-hidden">
        <div className="flex h-16 items-center gap-space-sm px-gutter">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-on-primary">
            <Icon name="support_agent" size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-headline-sm leading-tight tracking-tight text-inverse-on-surface">SupportHub</span>
            <span className="text-label-sm uppercase tracking-wider text-inverse-primary">Enterprise Core</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-space-sm py-space-md">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter((item) => canSeeNavItem(user, item))
            if (visibleItems.length === 0) return null

            return (
              <div key={section.title} className="mb-space-lg last:mb-0">
                <div className="px-space-sm pb-space-xs text-label-sm uppercase tracking-wider text-secondary-fixed-dim">
                  {section.title}
                </div>
                <div className="flex flex-col gap-1">
                  {visibleItems.map((item) => {
                    const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={onNavigate}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'flex items-center justify-between gap-space-sm rounded-lg px-space-md py-space-sm text-title-sm transition-colors',
                          isActive
                            ? 'bg-primary-container font-semibold text-on-primary-container shadow-sm'
                            : 'text-secondary-fixed hover:bg-surface-variant hover:text-on-surface',
                        )}
                      >
                        <span className="flex items-center gap-space-sm">
                          <Icon name={item.icon} size={18} />
                          <span>{item.label}</span>
                        </span>
                        {item.badge !== undefined && (
                          <span className="rounded bg-primary px-1.5 py-0.5 text-label-sm font-bold text-on-primary">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
