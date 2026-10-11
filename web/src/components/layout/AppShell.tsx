import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { ImpersonationBanner } from '@/components/layout/ImpersonationBanner'
import { Sidebar } from '@/components/navigation/Sidebar'
import { TopNavigation } from '@/components/navigation/TopNavigation'

/** Authenticated application shell: persistent sidebar + top bar, collapsing to a drawer on mobile. */
export function AppShell() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

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
          <Outlet />
        </main>
      </div>
    </div>
  )
}
