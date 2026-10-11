import type { RawTicketCategory, RawTicketPriority, RawTicketStatus } from '@/features/tickets/api/ticketMappers'
import { mapTicketCategory, mapTicketPriority, mapTicketStatus } from '@/features/tickets/api/ticketMappers'
import { apiFetchPage } from '@/services/api/client'
import type { RawCustomer, RawDepartment, RawUser } from '@/services/api/mappers'
import { mapCustomer, mapDepartment, mapUser } from '@/services/api/mappers'
import type { Customer } from '@/types/customer'
import type { Department } from '@/types/department'
import type { TicketCategory, TicketPriority, TicketStatus } from '@/types/ticket'
import type { User } from '@/types/user'

const LOOKUP_PAGE = { per_page: 100 }

/**
 * Small reference-data endpoints used to populate ticket forms, filters, and
 * badges. Each maps 1:1 to its own route file under api/routes/api/.
 */
export const lookupsApi = {
  async listStatuses(): Promise<TicketStatus[]> {
    const page = await apiFetchPage<RawTicketStatus, TicketStatus>('/statuses', mapTicketStatus, { params: LOOKUP_PAGE })
    return page.items
  },

  async listPriorities(): Promise<TicketPriority[]> {
    const page = await apiFetchPage<RawTicketPriority, TicketPriority>('/priorities', mapTicketPriority, { params: LOOKUP_PAGE })
    return page.items
  },

  async listCategories(): Promise<TicketCategory[]> {
    const page = await apiFetchPage<RawTicketCategory, TicketCategory>('/categories', mapTicketCategory, { params: LOOKUP_PAGE })
    return page.items
  },

  async listDepartments(): Promise<Department[]> {
    const page = await apiFetchPage<RawDepartment, Department>('/departments', mapDepartment, { params: LOOKUP_PAGE })
    return page.items
  },

  async listCustomers(search?: string): Promise<Customer[]> {
    const page = await apiFetchPage<RawCustomer, Customer>('/customers', mapCustomer, {
      params: { ...LOOKUP_PAGE, search },
    })
    return page.items
  },

  async listAgents(search?: string): Promise<User[]> {
    const page = await apiFetchPage<RawUser, User>('/users', mapUser, { params: { ...LOOKUP_PAGE, search } })
    // Only active staff can hold a ticket — the assign endpoint rejects
    // customers, role-less and deactivated accounts with a 422, so don't offer them.
    return page.items.filter((u) => u.isActive && u.roles.length > 0 && !u.roles.includes('Customer'))
  },
}
