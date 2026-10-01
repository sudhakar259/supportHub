import type { Customer } from '@/types/customer'
import type { Department } from '@/types/department'
import type { Role } from '@/types/role'
import type { User } from '@/types/user'

/** Raw (snake_case) shapes exactly as the Laravel API resources send them. */

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
  departments?: RawDepartment[]
  customer?: RawCustomer | null
}

export interface RawDepartment {
  id: number
  name: string
  code: string | null
  description: string | null
  manager?: RawUser | null
  is_active: boolean
  agents_count: number | null
  tickets_count: number | null
}

export interface RawCustomer {
  id: number
  company_name: string | null
  customer_type: string
  phone: string | null
  timezone: string | null
  user?: RawUser | null
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
    departments: (raw.departments ?? []).map(mapDepartment),
    customer: raw.customer ? mapCustomer(raw.customer) : null,
  }
}

export function mapDepartment(raw: RawDepartment): Department {
  return {
    id: raw.id,
    name: raw.name,
    code: raw.code,
    description: raw.description,
    manager: raw.manager ? mapUser(raw.manager) : null,
    isActive: raw.is_active,
    agentsCount: raw.agents_count,
    ticketsCount: raw.tickets_count,
  }
}

export function mapCustomer(raw: RawCustomer): Customer {
  return {
    id: raw.id,
    companyName: raw.company_name,
    customerType: raw.customer_type,
    phone: raw.phone,
    timezone: raw.timezone,
    user: raw.user ? mapUser(raw.user) : null,
  }
}

export interface RawRole {
  id: number
  name: string
  permissions?: string[]
  users_count: number | null
  created_at: string | null
}

export function mapRole(raw: RawRole): Role {
  return {
    id: raw.id,
    name: raw.name,
    permissions: raw.permissions ?? [],
    usersCount: raw.users_count,
    createdAt: raw.created_at,
  }
}
