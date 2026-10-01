import type { ReactNode } from 'react'

import { AccessDeniedPage } from '@/components/feedback/AccessDeniedPage'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { hasPermission } from '@/types/user'

export interface RequirePermissionProps {
  /** A single permission, or a list meaning "has at least one of these" — matches NavItem.permission. */
  permission: string | string[]
  children: ReactNode
}

/**
 * Route-level permission gate. Sits inside ProtectedRoute (so auth is
 * already confirmed) and additionally requires the given permission(s),
 * matching what nav-items.ts already uses to decide sidebar visibility —
 * this makes that same rule an actual access control, not just a hidden
 * link. The backend remains the authoritative enforcement either way.
 */
export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const { user } = useAuth()
  const required = Array.isArray(permission) ? permission : [permission]
  const allowed = required.some((p) => hasPermission(user, p))

  if (!allowed) return <AccessDeniedPage />

  return <>{children}</>
}
