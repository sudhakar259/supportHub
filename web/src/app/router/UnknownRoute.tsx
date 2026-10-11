import { ROUTES } from '@/app/router/routes'
import { LoadingState } from '@/components/feedback/LoadingState'
import { NotFoundContent, NotFoundPage } from '@/components/feedback/NotFoundPage'
import { AppShell } from '@/components/layout/AppShell'
import { PlatformShell } from '@/components/layout/PlatformShell'
import { useAuth } from '@/features/auth/hooks/useAuth'

/**
 * Any address nothing else matches. Inside the app it keeps the sidebar and top bar; outside it shows the public
 * 404. (Unknown addresses used to be sent to the sign-in page, which made a mistyped link look like a logout.)
 */
export function UnknownRoute() {
  const { user, isPlatformAdmin, isBootstrapping } = useAuth()

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="Opening DeskNu…" />
      </div>
    )
  }

  if (user && isPlatformAdmin) {
    return (
      <PlatformShell>
        <NotFoundContent homeTo={ROUTES.platformDashboard} homeLabel="Go to the dashboard" />
      </PlatformShell>
    )
  }

  if (user) {
    return (
      <AppShell>
        <NotFoundContent homeTo={ROUTES.dashboard} homeLabel="Go to the dashboard" />
      </AppShell>
    )
  }

  return <NotFoundPage />
}
