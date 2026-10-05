import { Navigate, Outlet } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'

/**
 * Layout-route guard for the Platform Admin subtree. Sits inside ProtectedRoute
 * (auth already confirmed) and redirects any non-Platform-Admin user back into
 * the tenant workspace rather than showing an error — mirrors RequireTenantUser.
 */
export function RequirePlatformAdmin() {
  const { isPlatformAdmin } = useAuth()

  if (!isPlatformAdmin) return <Navigate to={ROUTES.dashboard} replace />

  return <Outlet />
}
