export interface RegisterTenantPayload {
  tenantName: string
  tenantSlug: string
  ownerName: string
  ownerEmail: string
  ownerPassword: string
  ownerPasswordConfirmation: string
  plan?: string
  phone?: string
  website?: string
  country?: string
  timezone?: string
}

export interface TenantLookupResult {
  available: boolean
}

export type BillingInterval = 'monthly' | 'yearly'

export interface MembershipPlanLimits {
  users: number | null
  customers: number | null
  ticketsPerMonth: number | null
  departments: number | null
  apiRequestsPerDay: number | null
  webhooks: number | null
}

export interface MembershipPlan {
  id: number
  name: string
  slug: string
  description: string | null
  priceCents: number
  currency: string
  billingInterval: BillingInterval
  limits: MembershipPlanLimits
  isActive: boolean
}
