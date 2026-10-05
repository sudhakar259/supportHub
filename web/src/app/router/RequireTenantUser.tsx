import { Navigate, Outlet } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'

/**
 * Layout-route guard for the tenant workspace subtree. Redirects a Platform
 * Admin (who has no tenant workspace) into the Platform Admin console instead
 * of showing an error — mirrors RequirePlatformAdmin.
 */
export function RequireTenantUser() {
  const { isPlatformAdmin } = useAuth()

  if (isPlatformAdmin) return <Navigate to={ROUTES.platformDashboard} replace />

  return <Outlet />
}
