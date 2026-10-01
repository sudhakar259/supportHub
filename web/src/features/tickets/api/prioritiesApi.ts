import type { RawTicketPriority } from '@/features/tickets/api/ticketMappers'
import { mapTicketPriority } from '@/features/tickets/api/ticketMappers'
import { apiFetch, apiFetchPage } from '@/services/api/client'
import type { TicketPriority } from '@/types/ticket'

export interface PriorityFormPayload {
  name: string
  slug?: string
  level: number
  color?: string
  isDefault?: boolean
}

/** Maps 1:1 to api/routes/api/priorities.php — see TicketPriorityController.php for the exact contract. */
export const prioritiesApi = {
  async list(): Promise<TicketPriority[]> {
    const page = await apiFetchPage<RawTicketPriority, TicketPriority>('/priorities', mapTicketPriority)
    return page.items
  },

  async create(payload: PriorityFormPayload): Promise<TicketPriority> {
    const raw = await apiFetch<RawTicketPriority>('/priorities', {
      method: 'POST',
      body: { name: payload.name, slug: payload.slug, level: payload.level, color: payload.color },
    })
    return mapTicketPriority(raw)
  },

  async update(id: number, payload: Partial<PriorityFormPayload>): Promise<TicketPriority> {
    const raw = await apiFetch<RawTicketPriority>(`/priorities/${id}`, {
      method: 'PUT',
      body: { name: payload.name, slug: payload.slug, level: payload.level, color: payload.color },
    })
    return mapTicketPriority(raw)
  },

  async destroy(id: number): Promise<void> {
    await apiFetch<null>(`/priorities/${id}`, { method: 'DELETE' })
  },
}
