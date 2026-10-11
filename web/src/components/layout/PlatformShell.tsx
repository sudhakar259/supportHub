import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { cn } from '@/utils/cn'

const PLATFORM_NAV_ITEMS = [
  { label: 'Dashboard', path: ROUTES.platformDashboard, icon: 'grid_view' },
  { label: 'Tenants', path: ROUTES.platformTenants, icon: 'apartment' },
  { label: 'Membership Plans', path: ROUTES.platformPlans, icon: 'sell' },
]

/**
 * Minimal chrome for the Platform Admin console: header + a small local nav
 * list (not the tenant Sidebar/NAV_SECTIONS — that system is permission-gated
 * for tenant-domain permissions the Platform Admin role deliberately holds
 * none of, so reusing it as-is would render an empty sidebar).
 */
export function PlatformShell() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center justify-between gap-gutter border-b border-surface-container-high bg-inverse-surface px-gutter-lg text-inverse-on-surface">
        <div className="flex items-center gap-space-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
            <Icon name="admin_panel_settings" size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-title-sm leading-tight">SupportHub</span>
            <span className="text-label-sm uppercase tracking-wider text-secondary-fixed">Platform Admin</span>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            className="flex items-center gap-space-sm rounded-lg px-space-xs py-1 transition-colors hover:bg-inverse-on-surface/10"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Avatar name={user?.name ?? '?'} src={user?.avatarPath} size={32} />
            <div className="hidden flex-col text-left sm:flex">
              <span className="text-title-sm leading-tight">{user?.name}</span>
              <span className="text-label-sm leading-none text-secondary-fixed">Platform Admin</span>
            </div>
            <Icon name="expand_more" size={18} className="ml-1 text-secondary-fixed" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-lg bg-surface-container-lowest py-1 text-on-surface shadow-lg ring-1 ring-outline-variant/40">
              <Link
                to={ROUTES.platformAccountSecurity}
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-space-sm px-space-md py-space-sm text-left text-body-sm hover:bg-surface-container-low"
              >
                <Icon name="shield" size={18} />
                Account security
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="flex w-full items-center gap-space-sm px-space-md py-space-sm text-left text-body-sm hover:bg-surface-container-low"
              >
                <Icon name="logout" size={18} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        <aside className="hidden h-[calc(100vh-4rem)] w-56 shrink-0 flex-col gap-1 border-r border-surface-container-high bg-surface-container-lowest p-space-sm sm:flex">
          {PLATFORM_NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-space-sm rounded-lg px-space-md py-space-sm text-title-sm transition-colors',
                  isActive ? 'bg-primary-container font-semibold text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-low',
                )}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </Link>
            )
          })}
        </aside>

        <main className="min-h-[calc(100vh-4rem)] w-full bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
