import type { Webhook, WebhookDelivery, WebhookEvent, WebhookFormPayload } from '@/features/webhooks/types'
import { apiFetch, apiFetchPage } from '@/services/api/client'
import type { Paginated } from '@/types/pagination'

/** Mirrors api/app/Http/Resources/WebhookResource.php */
interface RawWebhook {
  id: number
  name: string
  url: string
  events: WebhookEvent[]
  is_active: boolean
  last_triggered_at: string | null
  created_at: string | null
}

interface RawWebhookWithSecret extends RawWebhook {
  secret: string
}

/** Mirrors api/app/Http/Resources/WebhookDeliveryResource.php */
interface RawWebhookDelivery {
  id: number
  event: string
  response_status: number | null
  success: boolean
  attempt: number
  attempted_at: string | null
}

function mapWebhook(raw: RawWebhook): Webhook {
  return {
    id: raw.id,
    name: raw.name,
    url: raw.url,
    events: raw.events,
    isActive: raw.is_active,
    lastTriggeredAt: raw.last_triggered_at,
    createdAt: raw.created_at,
  }
}

export interface CreatedWebhook extends Webhook {
  /** Plaintext signing secret — present only in the store()/rotateSecret() response, never again. */
  secret: string
}

function mapCreatedWebhook(raw: RawWebhookWithSecret): CreatedWebhook {
  return { ...mapWebhook(raw), secret: raw.secret }
}

function mapWebhookDelivery(raw: RawWebhookDelivery): WebhookDelivery {
  return {
    id: raw.id,
    event: raw.event,
    responseStatus: raw.response_status,
    success: raw.success,
    attempt: raw.attempt,
    attemptedAt: raw.attempted_at,
  }
}

/** Maps 1:1 to api/routes/api/webhooks.php — see WebhookController.php for the exact contract. */
export const webhooksApi = {
  async list(): Promise<Webhook[]> {
    const raw = await apiFetch<RawWebhook[]>('/webhooks')
    return raw.map(mapWebhook)
  },

  async get(id: number): Promise<Webhook> {
    const raw = await apiFetch<RawWebhook>(`/webhooks/${id}`)
    return mapWebhook(raw)
  },

  async create(payload: WebhookFormPayload): Promise<CreatedWebhook> {
    const raw = await apiFetch<RawWebhookWithSecret>('/webhooks', {
      method: 'POST',
      body: { name: payload.name, url: payload.url, events: payload.events, is_active: payload.isActive },
    })
    return mapCreatedWebhook(raw)
  },

  async update(id: number, payload: Partial<WebhookFormPayload>): Promise<Webhook> {
    const raw = await apiFetch<RawWebhook>(`/webhooks/${id}`, {
      method: 'PUT',
      body: { name: payload.name, url: payload.url, events: payload.events, is_active: payload.isActive },
    })
    return mapWebhook(raw)
  },

  async destroy(id: number): Promise<void> {
    await apiFetch<null>(`/webhooks/${id}`, { method: 'DELETE' })
  },

  async rotateSecret(id: number): Promise<CreatedWebhook> {
    const raw = await apiFetch<RawWebhookWithSecret>(`/webhooks/${id}/rotate-secret`, { method: 'POST' })
    return mapCreatedWebhook(raw)
  },

  async test(id: number): Promise<WebhookDelivery> {
    const raw = await apiFetch<RawWebhookDelivery>(`/webhooks/${id}/test`, { method: 'POST' })
    return mapWebhookDelivery(raw)
  },

  async listDeliveries(webhookId: number, params: { page?: number; perPage?: number } = {}): Promise<Paginated<WebhookDelivery>> {
    return apiFetchPage<RawWebhookDelivery, WebhookDelivery>(`/webhooks/${webhookId}/deliveries`, mapWebhookDelivery, {
      params: { page: params.page, per_page: params.perPage },
    })
  },
}
