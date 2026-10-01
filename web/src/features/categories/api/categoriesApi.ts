import type { RawTicketCategory } from '@/features/tickets/api/ticketMappers'
import { mapTicketCategory } from '@/features/tickets/api/ticketMappers'
import type { CategoryFormPayload } from '@/features/categories/types'
import { apiFetch, apiFetchPage } from '@/services/api/client'
import type { TicketCategory } from '@/types/ticket'

/** Maps 1:1 to api/routes/api/categories.php — see TicketCategoryController.php for the exact contract. */
export const categoriesApi = {
  async list(): Promise<TicketCategory[]> {
    // Index returns all top-level categories with children eager-loaded, unpaginated.
    const page = await apiFetchPage<RawTicketCategory, TicketCategory>('/categories', mapTicketCategory)
    return page.items
  },

  async create(payload: CategoryFormPayload): Promise<TicketCategory> {
    const raw = await apiFetch<RawTicketCategory>('/categories', {
      method: 'POST',
      body: {
        name: payload.name,
        slug: payload.slug,
        parent_id: payload.parentId,
        department_id: payload.departmentId,
        description: payload.description,
        is_active: payload.isActive,
        sort_order: payload.sortOrder,
      },
    })
    return mapTicketCategory(raw)
  },

  async update(id: number, payload: Partial<CategoryFormPayload>): Promise<TicketCategory> {
    const raw = await apiFetch<RawTicketCategory>(`/categories/${id}`, {
      method: 'PUT',
      body: {
        name: payload.name,
        slug: payload.slug,
        parent_id: payload.parentId,
        department_id: payload.departmentId,
        description: payload.description,
        is_active: payload.isActive,
        sort_order: payload.sortOrder,
      },
    })
    return mapTicketCategory(raw)
  },

  async destroy(id: number): Promise<void> {
    await apiFetch<null>(`/categories/${id}`, { method: 'DELETE' })
  },
}
