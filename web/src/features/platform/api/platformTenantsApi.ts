import type { RawMembershipPlan } from '@/features/tenants/api/membershipPlansApi'
import { mapMembershipPlan } from '@/features/tenants/api/membershipPlansApi'
import type { AdminTenant, AdminTenantFilters, TenantSubscriptionSummary, UpdateTenantPayload } from '@/features/platform/types'
import { apiFetch, apiFetchPage } from '@/services/api/client'
import type { Paginated } from '@/types/pagination'

interface RawSubscription {
  id: number
  status: string
  plan: RawMembershipPlan
  trial_ends_at: string | null
  current_period_ends_at: string | null
  cancelled_at: string | null
}

export interface RawAdminTenant {
  id: number
  name: string
  slug: string
  status: string
  email: string | null
  phone: string | null
  website: string | null
  country: string | null
  timezone: string
  trial_ends_at: string | null
  suspended_at: string | null
  subscription: RawSubscription | null
  users_count: number
  customers_count: number
  tickets_count: number
  created_at: string
}

function mapSubscriptionSummary(raw: RawSubscription): TenantSubscriptionSummary {
  return {
    id: raw.id,
    status: raw.status as TenantSubscriptionSummary['status'],
    plan: mapMembershipPlan(raw.plan),
    trialEndsAt: raw.trial_ends_at,
    currentPeriodEndsAt: raw.current_period_ends_at,
    cancelledAt: raw.cancelled_at,
  }
}

function mapAdminTenant(raw: RawAdminTenant): AdminTenant {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    status: raw.status as AdminTenant['status'],
    email: raw.email,
    phone: raw.phone,
    website: raw.website,
    country: raw.country,
    timezone: raw.timezone,
    trialEndsAt: raw.trial_ends_at,
    suspendedAt: raw.suspended_at,
    subscription: raw.subscription ? mapSubscriptionSummary(raw.subscription) : null,
    usersCount: raw.users_count,
    customersCount: raw.customers_count,
    ticketsCount: raw.tickets_count,
    createdAt: raw.created_at,
  }
}

/** Maps 1:1 to api/routes/api/platform.php — see Platform/TenantController.php for the exact contract. */
export const platformTenantsApi = {
  async list(filters: AdminTenantFilters = {}): Promise<Paginated<AdminTenant>> {
    return apiFetchPage<RawAdminTenant, AdminTenant>('/platform/tenants', mapAdminTenant, {
      params: {
        'filter[status]': filters.status,
        'filter[name]': filters.name || undefined,
        sort: filters.sort,
        page: filters.page,
        per_page: filters.perPage,
      },
    })
  },

  async get(id: number): Promise<AdminTenant> {
    const raw = await apiFetch<RawAdminTenant>(`/platform/tenants/${id}`)
    return mapAdminTenant(raw)
  },

  async update(id: number, payload: UpdateTenantPayload): Promise<AdminTenant> {
    const raw = await apiFetch<RawAdminTenant>(`/platform/tenants/${id}`, {
      method: 'PUT',
      body: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        website: payload.website,
        country: payload.country,
        timezone: payload.timezone,
      },
    })
    return mapAdminTenant(raw)
  },

  async suspend(id: number): Promise<AdminTenant> {
    const raw = await apiFetch<RawAdminTenant>(`/platform/tenants/${id}/suspend`, { method: 'POST' })
    return mapAdminTenant(raw)
  },

  async activate(id: number): Promise<AdminTenant> {
    const raw = await apiFetch<RawAdminTenant>(`/platform/tenants/${id}/activate`, { method: 'POST' })
    return mapAdminTenant(raw)
  },
}
