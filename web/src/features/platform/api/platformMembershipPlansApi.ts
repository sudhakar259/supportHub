import type { MembershipPlanFormPayload } from '@/features/platform/types'
import type { RawMembershipPlan } from '@/features/tenants/api/membershipPlansApi'
import { mapMembershipPlan } from '@/features/tenants/api/membershipPlansApi'
import type { MembershipPlan, MembershipPlanLimits } from '@/features/tenants/types'
import { apiFetch } from '@/services/api/client'

function toRawLimits(limits: MembershipPlanLimits | undefined): Record<string, number | null> | undefined {
  if (!limits) return undefined
  return {
    users: limits.users,
    customers: limits.customers,
    tickets_per_month: limits.ticketsPerMonth,
    departments: limits.departments,
    api_requests_per_day: limits.apiRequestsPerDay,
    webhooks: limits.webhooks,
  }
}

/** Maps 1:1 to api/routes/api/platform.php — see Platform/MembershipPlanController.php for the exact contract. */
export const platformMembershipPlansApi = {
  async list(): Promise<MembershipPlan[]> {
    const raw = await apiFetch<RawMembershipPlan[]>('/platform/membership-plans')
    return raw.map(mapMembershipPlan)
  },

  async create(payload: MembershipPlanFormPayload): Promise<MembershipPlan> {
    const raw = await apiFetch<RawMembershipPlan>('/platform/membership-plans', {
      method: 'POST',
      body: {
        name: payload.name,
        slug: payload.slug,
        description: payload.description || undefined,
        price_cents: payload.priceCents,
        currency: payload.currency || undefined,
        billing_interval: payload.billingInterval,
        limits: toRawLimits(payload.limits),
        is_active: payload.isActive,
        sort_order: payload.sortOrder,
      },
    })
    return mapMembershipPlan(raw)
  },

  async update(id: number, payload: MembershipPlanFormPayload): Promise<MembershipPlan> {
    const raw = await apiFetch<RawMembershipPlan>(`/platform/membership-plans/${id}`, {
      method: 'PUT',
      body: {
        name: payload.name,
        slug: payload.slug,
        description: payload.description || undefined,
        price_cents: payload.priceCents,
        currency: payload.currency || undefined,
        billing_interval: payload.billingInterval,
        limits: toRawLimits(payload.limits),
        is_active: payload.isActive,
        sort_order: payload.sortOrder,
      },
    })
    return mapMembershipPlan(raw)
  },
}
