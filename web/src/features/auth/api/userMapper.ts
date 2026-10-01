import type { User } from '@/types/user'

/** Raw shape returned by UserResource (snake_case, as Laravel sends it). */
export interface RawUser {
  id: number
  name: string
  email: string
  phone: string | null
  avatar_path: string | null
  timezone: string | null
  is_active: boolean
  email_verified_at: string | null
  last_login_at: string | null
  roles?: string[]
  permissions?: string[]
  departments?: { id: number; name: string; slug: string }[]
  customer?: { id: number; company_name: string | null; customer_type: 'individual' | 'business' } | null
}

export function mapUser(raw: RawUser): User {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    avatarPath: raw.avatar_path,
    timezone: raw.timezone,
    isActive: raw.is_active,
    emailVerifiedAt: raw.email_verified_at,
    lastLoginAt: raw.last_login_at,
    roles: raw.roles ?? [],
    permissions: raw.permissions ?? [],
    departments: raw.departments ?? [],
    customer: raw.customer
      ? { id: raw.customer.id, companyName: raw.customer.company_name, customerType: raw.customer.customer_type }
      : null,
  }
}
