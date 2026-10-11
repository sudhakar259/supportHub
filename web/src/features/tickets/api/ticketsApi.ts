import type { RawTicket, RawTicketAttachment, RawTicketMessage } from '@/features/tickets/api/ticketMappers'
import { mapTicket, mapTicketAttachment, mapTicketMessage } from '@/features/tickets/api/ticketMappers'
import type { AssignTicketPayload, CreateTicketPayload, StatusActionPayload, Ticket, TicketAttachment, TicketFilters, TicketMessage } from '@/types/ticket'
import { apiFetch, apiFetchBlob, apiFetchPage } from '@/services/api/client'
import type { Paginated } from '@/types/pagination'

function toQueryParams(filters: TicketFilters): Record<string, string | number | undefined> {
  return {
    'filter[status_id]': filters.statusId,
    'filter[priority_id]': filters.priorityId,
    'filter[department_id]': filters.departmentId,
    'filter[assignee_id]': filters.assigneeId,
    'filter[customer_id]': filters.customerId,
    'filter[search]': filters.search || undefined,
    'filter[sla_status]': filters.slaStatus,
    sort: filters.sort,
    page: filters.page,
    per_page: filters.perPage,
  }
}

/**
 * Ticket endpoints. Maps 1:1 to api/routes/api/tickets.php — see
 * api/app/Http/Controllers/Api/V1/TicketController.php for the exact contract.
 */
export const ticketsApi = {
  async list(filters: TicketFilters = {}): Promise<Paginated<Ticket>> {
    return apiFetchPage<RawTicket, Ticket>('/tickets', mapTicket, { params: toQueryParams(filters) })
  },

  async get(id: string): Promise<Ticket> {
    const raw = await apiFetch<RawTicket>(`/tickets/${id}`)
    return mapTicket(raw)
  },

  async create(payload: CreateTicketPayload): Promise<Ticket> {
    const raw = await apiFetch<RawTicket>('/tickets', {
      method: 'POST',
      body: {
        subject: payload.subject,
        description: payload.description,
        category_id: payload.categoryId,
        priority_id: payload.priorityId,
        customer_id: payload.customerId,
      },
    })
    return mapTicket(raw)
  },

  async assign(id: string, payload: AssignTicketPayload): Promise<Ticket> {
    const raw = await apiFetch<RawTicket>(`/tickets/${id}/assign`, {
      method: 'POST',
      body: { assignee_id: payload.assigneeId, department_id: payload.departmentId, note: payload.note },
    })
    return mapTicket(raw)
  },

  async escalate(id: string, payload: StatusActionPayload = {}): Promise<Ticket> {
    const raw = await apiFetch<RawTicket>(`/tickets/${id}/escalate`, { method: 'POST', body: payload })
    return mapTicket(raw)
  },

  async resolve(id: string, payload: StatusActionPayload = {}): Promise<Ticket> {
    const raw = await apiFetch<RawTicket>(`/tickets/${id}/resolve`, { method: 'POST', body: payload })
    return mapTicket(raw)
  },

  async close(id: string, payload: StatusActionPayload = {}): Promise<Ticket> {
    const raw = await apiFetch<RawTicket>(`/tickets/${id}/close`, { method: 'POST', body: payload })
    return mapTicket(raw)
  },

  async reopen(id: string, payload: StatusActionPayload = {}): Promise<Ticket> {
    const raw = await apiFetch<RawTicket>(`/tickets/${id}/reopen`, { method: 'POST', body: payload })
    return mapTicket(raw)
  },

  async listMessages(ticketId: string): Promise<Paginated<TicketMessage>> {
    return apiFetchPage<RawTicketMessage, TicketMessage>(`/tickets/${ticketId}/messages`, mapTicketMessage, {
      params: { per_page: 100 },
    })
  },

  async postMessage(ticketId: string, body: string, isInternal: boolean, files: File[] = []): Promise<TicketMessage> {
    // With files the request must be multipart. Laravel's boolean rule accepts
    // "1"/"0" (not "true"/"false"), hence the numeric strings.
    const requestBody = files.length
      ? (() => {
          const form = new FormData()
          form.append('body', body)
          form.append('is_internal', isInternal ? '1' : '0')
          files.forEach((file) => form.append('attachments[]', file))
          return form
        })()
      : { body, is_internal: isInternal }

    const raw = await apiFetch<RawTicketMessage>(`/tickets/${ticketId}/messages`, { method: 'POST', body: requestBody })
    return mapTicketMessage(raw)
  },

  /** Attaches a file to the ticket itself (shown with the original request). */
  async uploadAttachment(ticketId: string, file: File): Promise<TicketAttachment> {
    const form = new FormData()
    form.append('file', file)
    const raw = await apiFetch<RawTicketAttachment>(`/tickets/${ticketId}/attachments`, { method: 'POST', body: form })
    return mapTicketAttachment(raw)
  },

  /** Downloads an attachment with the signed-in user's token and hands it to the browser as a file save. */
  async downloadAttachment(attachment: TicketAttachment): Promise<void> {
    const blob = await apiFetchBlob(attachment.downloadUrl)
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = attachment.originalFilename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(objectUrl)
  },
}
