import type { SubscriptionStatus } from '@/features/billing/types'
import type { MembershipPlan, MembershipPlanLimits } from '@/features/tenants/types'

export type TenantStatus = 'trial' | 'active' | 'suspended' | 'cancelled'

export interface TenantSubscriptionSummary {
  id: number
  status: SubscriptionStatus
  plan: MembershipPlan
  trialEndsAt: string | null
  currentPeriodEndsAt: string | null
  cancelledAt: string | null
}

export interface AdminTenant {
  id: number
  name: string
  slug: string
  status: TenantStatus
  email: string | null
  phone: string | null
  website: string | null
  country: string | null
  timezone: string
  trialEndsAt: string | null
  suspendedAt: string | null
  subscription: TenantSubscriptionSummary | null
  usersCount: number
  customersCount: number
  ticketsCount: number
  createdAt: string
}

export interface AdminTenantFilters {
  status?: TenantStatus
  name?: string
  sort?: string
  page?: number
  perPage?: number
}

export interface UpdateTenantPayload {
  name?: string
  email?: string | null
  phone?: string | null
  website?: string | null
  country?: string | null
  timezone?: string
}

export interface MembershipPlanFormPayload {
  name?: string
  slug?: string
  description?: string | null
  priceCents?: number
  currency?: string
  billingInterval?: 'monthly' | 'yearly'
  limits?: MembershipPlanLimits
  isActive?: boolean
  sortOrder?: number
}
