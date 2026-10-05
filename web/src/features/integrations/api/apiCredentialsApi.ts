import type { ApiCredential, ApiCredentialFormPayload, ApiCredentialScope, ApiCredentialStatus } from '@/features/integrations/types'
import { apiFetch } from '@/services/api/client'
import type { RawUser } from '@/services/api/mappers'
import { mapUser } from '@/services/api/mappers'

/** Mirrors api/app/Http/Resources/ApiCredentialResource.php */
interface RawApiCredential {
  id: number
  name: string
  key: string
  secret_last_four: string
  scopes: ApiCredentialScope[]
  status: ApiCredentialStatus
  creator: RawUser | null
  last_used_at: string | null
  revoked_at: string | null
  created_at: string | null
}

interface RawApiCredentialWithSecret extends RawApiCredential {
  secret: string
}

function mapApiCredential(raw: RawApiCredential): ApiCredential {
  return {
    id: raw.id,
    name: raw.name,
    key: raw.key,
    secretLastFour: raw.secret_last_four,
    scopes: raw.scopes,
    status: raw.status,
    creator: raw.creator ? mapUser(raw.creator) : null,
    lastUsedAt: raw.last_used_at,
    revokedAt: raw.revoked_at,
    createdAt: raw.created_at,
  }
}

export interface CreatedApiCredential extends ApiCredential {
  /** Plaintext secret — present only in the store()/rotate() response, never again. */
  secret: string
}

function mapCreatedApiCredential(raw: RawApiCredentialWithSecret): CreatedApiCredential {
  return { ...mapApiCredential(raw), secret: raw.secret }
}

/**
 * Maps 1:1 to api/routes/api/api-credentials.php — see ApiCredentialController.php.
 * Note: index() returns a plain array, not a paginated collection — there is no
 * server-side pagination on this endpoint, so no apiFetchPage/meta here.
 */
export const apiCredentialsApi = {
  async list(): Promise<ApiCredential[]> {
    const raw = await apiFetch<RawApiCredential[]>('/api-credentials')
    return raw.map(mapApiCredential)
  },

  async get(id: number): Promise<ApiCredential> {
    const raw = await apiFetch<RawApiCredential>(`/api-credentials/${id}`)
    return mapApiCredential(raw)
  },

  async create(payload: ApiCredentialFormPayload): Promise<CreatedApiCredential> {
    const raw = await apiFetch<RawApiCredentialWithSecret>('/api-credentials', {
      method: 'POST',
      body: { name: payload.name, scopes: payload.scopes },
    })
    return mapCreatedApiCredential(raw)
  },

  async update(id: number, payload: Partial<ApiCredentialFormPayload>): Promise<ApiCredential> {
    const raw = await apiFetch<RawApiCredential>(`/api-credentials/${id}`, {
      method: 'PUT',
      body: { name: payload.name, scopes: payload.scopes },
    })
    return mapApiCredential(raw)
  },

  async rotate(id: number): Promise<CreatedApiCredential> {
    const raw = await apiFetch<RawApiCredentialWithSecret>(`/api-credentials/${id}/rotate`, { method: 'POST' })
    return mapCreatedApiCredential(raw)
  },

  async revoke(id: number): Promise<ApiCredential> {
    const raw = await apiFetch<RawApiCredential>(`/api-credentials/${id}/revoke`, { method: 'POST' })
    return mapApiCredential(raw)
  },
}
