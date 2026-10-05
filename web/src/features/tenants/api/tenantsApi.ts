import type { RegisterTenantPayload, TenantLookupResult } from '@/features/tenants/types'
import { apiFetch } from '@/services/api/client'
import type { RawUser } from '@/services/api/mappers'
import { mapUser } from '@/services/api/mappers'
import type { User } from '@/types/user'

interface RawTenant {
  id: number
  name: string
  slug: string
  status: string
}

interface RegisterTenantResponse {
  tenant: RawTenant
  user: RawUser
  token: string
  token_type: string
}

interface RawTenantLookup {
  available: boolean
}

/** Maps 1:1 to api/routes/api/tenants.php — see TenantController.php for the exact contract. */
export const tenantsApi = {
  async register(payload: RegisterTenantPayload): Promise<{ user: User; token: string }> {
    const result = await apiFetch<RegisterTenantResponse>('/tenants/register', {
      method: 'POST',
      body: {
        tenant_name: payload.tenantName,
        tenant_slug: payload.tenantSlug,
        owner_name: payload.ownerName,
        owner_email: payload.ownerEmail,
        owner_password: payload.ownerPassword,
        owner_password_confirmation: payload.ownerPasswordConfirmation,
        plan: payload.plan || undefined,
        phone: payload.phone || undefined,
        website: payload.website || undefined,
        country: payload.country || undefined,
        timezone: payload.timezone || undefined,
        device_name: 'web-browser',
      },
    })
    return { user: mapUser(result.user), token: result.token }
  },

  async lookupSlug(slug: string): Promise<TenantLookupResult | null> {
    try {
      const raw = await apiFetch<RawTenantLookup>(`/tenants/lookup/${encodeURIComponent(slug)}`)
      return { available: raw.available }
    } catch {
      return null
    }
  },
}
