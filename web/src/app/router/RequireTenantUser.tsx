import { Navigate, Outlet } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { WorkspaceRedirect } from '@/features/workspaces/WorkspaceRedirect'
import { workspaceSlug, workspaceUrl } from '@/features/workspaces/workspace'

/**
 * Layout-route guard for the tenant workspace subtree. Redirects a Platform
 * Admin (who has no tenant workspace) into the Platform Admin console instead
 * of showing an error — mirrors RequirePlatformAdmin.
 */
export function RequireTenantUser() {
  const { isPlatformAdmin, user, impersonator } = useAuth()

  if (isPlatformAdmin) return <Navigate to={ROUTES.platformDashboard} replace />

  if (user?.tenant && !impersonator && !workspaceSlug() && workspaceUrl(user.tenant.slug)) return <WorkspaceRedirect slug={user.tenant.slug} />

  if (user && !user.emailVerifiedAt && !impersonator) return <Navigate to={ROUTES.emailVerification} replace />

  return <Outlet />
}
