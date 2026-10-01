import { useState } from 'react'

import { Avatar } from '@/components/ui/Avatar'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { useAuth } from '@/features/auth/hooks/useAuth'

export interface TopNavigationProps {
  onOpenMenu: () => void
}

export function TopNavigation({ onOpenMenu }: TopNavigationProps) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 right-0 left-0 z-20 h-16 bg-surface-container-lowest/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl lg:left-64">
      <div className="flex h-16 w-full items-center justify-between gap-gutter px-gutter-lg">
        <div className="flex items-center gap-space-sm">
          <IconButton icon="menu" label="Open navigation" onClick={onOpenMenu} className="lg:hidden" />
          <div className="relative hidden max-w-lg flex-1 items-center sm:flex">
            <Icon name="search" size={20} className="pointer-events-none absolute left-space-md text-secondary" />
            <input
              type="search"
              placeholder="Search tickets, requesters, audit logs…"
              className="h-9 w-72 rounded-lg bg-surface-container-low pr-space-md pl-10 text-body-sm text-on-surface placeholder:text-secondary focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary-container focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-space-lg">
          <div className="hidden items-center gap-2 rounded-full bg-surface-container-low px-space-md py-1 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tertiary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-tertiary-container" />
            </span>
            <span className="text-label-sm font-bold tracking-wider text-tertiary">SYSTEMS LIVE</span>
          </div>
          <IconButton icon="notifications" label="Notifications" />
          <div className="h-6 w-px bg-surface-container-high" />
          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-space-sm rounded-lg pl-space-xs transition-colors hover:bg-surface-container-low"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Avatar name={user?.name ?? '?'} src={user?.avatarPath} size={32} />
              <div className="hidden flex-col text-left sm:flex">
                <span className="text-title-sm leading-tight text-on-surface">{user?.name}</span>
                <span className="text-label-sm leading-none text-secondary">{user?.roles[0] ?? 'Member'}</span>
              </div>
              <Icon name="expand_more" size={18} className="ml-1 text-secondary" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-surface-container-lowest py-1 shadow-lg ring-1 ring-outline-variant/40">
                <button
                  type="button"
                  onClick={() => logout()}
                  className="flex w-full items-center gap-space-sm px-space-md py-space-sm text-left text-body-sm text-on-surface hover:bg-surface-container-low"
                >
                  <Icon name="logout" size={18} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
