import type { RawTicketStatus } from '@/features/tickets/api/ticketMappers'
import { mapTicketStatus } from '@/features/tickets/api/ticketMappers'
import { apiFetch, apiFetchPage } from '@/services/api/client'
import type { TicketStatus } from '@/types/ticket'

export interface StatusFormPayload {
  name: string
  slug?: string
  color?: string
  isDefault?: boolean
  isClosed?: boolean
  sortOrder?: number
}

/** Maps 1:1 to api/routes/api/statuses.php — see TicketStatusController.php for the exact contract. */
export const statusesApi = {
  async list(): Promise<TicketStatus[]> {
    const page = await apiFetchPage<RawTicketStatus, TicketStatus>('/statuses', mapTicketStatus)
    return page.items
  },

  async create(payload: StatusFormPayload): Promise<TicketStatus> {
    const raw = await apiFetch<RawTicketStatus>('/statuses', {
      method: 'POST',
      body: { name: payload.name, slug: payload.slug, color: payload.color, is_closed: payload.isClosed, sort_order: payload.sortOrder },
    })
    return mapTicketStatus(raw)
  },

  async update(id: number, payload: Partial<StatusFormPayload>): Promise<TicketStatus> {
    const raw = await apiFetch<RawTicketStatus>(`/statuses/${id}`, {
      method: 'PUT',
      body: { name: payload.name, slug: payload.slug, color: payload.color, is_closed: payload.isClosed, sort_order: payload.sortOrder },
    })
    return mapTicketStatus(raw)
  },

  async destroy(id: number): Promise<void> {
    await apiFetch<null>(`/statuses/${id}`, { method: 'DELETE' })
  },
}
