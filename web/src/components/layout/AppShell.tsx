import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner'
import { Sidebar } from '@/components/navigation/Sidebar'
import { TopNavigation } from '@/components/navigation/TopNavigation'
import { useAuth } from '@/features/auth/hooks/useAuth'

/** Authenticated application shell: persistent sidebar + top bar, collapsing to a drawer on mobile. */
export function AppShell() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-on-background/40 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
          <div className="relative z-10">
            <Sidebar variant="drawer" onNavigate={() => setIsDrawerOpen(false)} />
          </div>
        </div>
      )}

      <ImpersonationBanner />

      <div className="lg:pl-64">
        <TopNavigation onOpenMenu={() => setIsDrawerOpen(true)} />
        <main className="min-h-screen w-full bg-background pt-16">
          {user?.tenant && (
            <div className="flex flex-wrap items-center gap-x-space-sm border-b border-outline-variant/50 bg-surface-container-low px-margin-mobile py-space-xs text-label-md sm:px-margin" aria-label="Current workspace">
              <span className="min-w-0 break-words font-semibold text-on-surface">{user.tenant.name}</span>
              <span className="min-w-0 break-all text-on-surface-variant">{window.location.host}</span>
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
