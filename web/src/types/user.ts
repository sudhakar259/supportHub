import type { Customer } from '@/types/customer'
import type { Department } from '@/types/department'

/** The shades derived from a workspace's brand colour (api BrandPalette), keyed like `on_primary`. */
export type BrandPalette = Record<string, string>

/** Mirrors api/app/Http/Resources/UserResource.php */
export interface User {
  id: number
  name: string
  email: string
  tenant?: { id: number; name: string; slug: string; workspaceUrl: string; brand?: BrandPalette | null } | null
  phone: string | null
  avatarPath: string | null
  timezone: string | null
  isActive: boolean
  emailVerifiedAt: string | null
  lastLoginAt: string | null
  roles: string[]
  permissions: string[]
  departments: Department[]
  customer: Customer | null
  /** Only sent for your own account, or to someone who manages users. */
  twoFactorEnabled?: boolean
  twoFactorRecoveryCodesRemaining?: number
  /** Set while the account is locked after too many failed sign-ins (administrators only). */
  lockedUntil?: string | null
}

export function hasRole(user: User | null | undefined, role: string): boolean {
  return user?.roles.includes(role) ?? false
}

export function hasPermission(user: User | null | undefined, permission: string): boolean {
  return user?.permissions.includes(permission) ?? false
}

/** Platform Admins are a distinct, tenant-less population (see api RequirePlatformAdmin middleware). */
export const PLATFORM_ADMIN_ROLE = 'Platform Admin'

export function isPlatformAdmin(user: User | null | undefined): boolean {
  return hasRole(user, PLATFORM_ADMIN_ROLE)
}
