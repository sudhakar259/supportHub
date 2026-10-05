import type { BillingInterval, MembershipPlan } from '@/features/tenants/types'
import { apiFetch } from '@/services/api/client'

/** Mirrors api/app/Http/Resources/MembershipPlanResource.php */
export interface RawMembershipPlan {
  id: number
  name: string
  slug: string
  description: string | null
  price_cents: number
  currency: string
  billing_interval: BillingInterval
  limits: {
    users: number | null
    customers: number | null
    tickets_per_month: number | null
    departments: number | null
    api_requests_per_day: number | null
    webhooks: number | null
  } | null
  is_active: boolean
}

export function mapMembershipPlan(raw: RawMembershipPlan): MembershipPlan {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    priceCents: raw.price_cents,
    currency: raw.currency,
    billingInterval: raw.billing_interval,
    isActive: raw.is_active,
    limits: {
      users: raw.limits?.users ?? null,
      customers: raw.limits?.customers ?? null,
      ticketsPerMonth: raw.limits?.tickets_per_month ?? null,
      departments: raw.limits?.departments ?? null,
      apiRequestsPerDay: raw.limits?.api_requests_per_day ?? null,
      webhooks: raw.limits?.webhooks ?? null,
    },
  }
}

/** Maps 1:1 to api/routes/api/plans.php — see MembershipPlanController.php for the exact contract. */
export const membershipPlansApi = {
  async list(): Promise<MembershipPlan[]> {
    const raw = await apiFetch<RawMembershipPlan[]>('/membership-plans')
    return raw.map(mapMembershipPlan)
  },
}
