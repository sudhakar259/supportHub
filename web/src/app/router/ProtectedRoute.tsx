import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { useAuth } from '@/features/auth/hooks/useAuth'

export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping, sessionError, retrySession } = useAuth()
  const location = useLocation()

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label="Restoring your session…" />
      </div>
    )
  }

  if (!isAuthenticated && sessionError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <ErrorState title="We could not restore your session" description={sessionError} onRetry={retrySession} />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}
