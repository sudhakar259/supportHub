import type { CreateCustomerPayload, CustomerFilters, UpdateCustomerPayload } from '@/features/customers/types'
import { apiDownloadFile, apiFetch, apiFetchPage } from '@/services/api/client'
import type { RawCustomer } from '@/services/api/mappers'
import { mapCustomer } from '@/services/api/mappers'
import type { Customer } from '@/types/customer'
import type { Paginated } from '@/types/pagination'

/** Maps 1:1 to api/routes/api/customers.php — see CustomerController.php for the exact contract. */
export const customersApi = {
  async list(filters: CustomerFilters = {}): Promise<Paginated<Customer>> {
    return apiFetchPage<RawCustomer, Customer>('/customers', mapCustomer, {
      params: {
        'filter[customer_type]': filters.customerType || undefined,
        'filter[company_name]': filters.companyName || undefined,
        sort: filters.sort,
        page: filters.page,
        per_page: filters.perPage,
      },
    })
  },

  async get(id: number): Promise<Customer> {
    const raw = await apiFetch<RawCustomer>(`/customers/${id}`)
    return mapCustomer(raw)
  },

  async create(payload: CreateCustomerPayload): Promise<Customer> {
    const raw = await apiFetch<RawCustomer>('/customers', {
      method: 'POST',
      body: {
        name: payload.name,
        email: payload.email,
        password: payload.password,
        password_confirmation: payload.passwordConfirmation,
        phone: payload.phone || undefined,
        company_name: payload.companyName || undefined,
        customer_type: payload.customerType,
      },
    })
    return mapCustomer(raw)
  },

  async update(id: number, payload: UpdateCustomerPayload): Promise<Customer> {
    const raw = await apiFetch<RawCustomer>(`/customers/${id}`, {
      method: 'PUT',
      body: { phone: payload.phone, company_name: payload.companyName, customer_type: payload.customerType, timezone: payload.timezone },
    })
    return mapCustomer(raw)
  },

  async destroy(id: number): Promise<void> {
    await apiFetch<null>(`/customers/${id}`, { method: 'DELETE' })
  },

  /** Downloads a JSON copy of everything held about the customer (a data-access request). Needs customers.export. */
  async exportData(id: number): Promise<void> {
    await apiDownloadFile(`/customers/${id}/export`, `customer-${id}-data.json`)
  },

  /** Anonymizes the customer. Irreversible. Needs customers.erase and the customer's email as confirmation. */
  async erase(id: number, payload: { confirmEmail: string; redactContent: boolean }): Promise<EraseCustomerResult> {
    const raw = await apiFetch<{ tickets: number; messages_redacted: number; attachments_removed: number; redacted_content: boolean }>(`/customers/${id}/erase`, {
      method: 'POST',
      body: { confirm_email: payload.confirmEmail, redact_content: payload.redactContent },
    })
    return { tickets: raw.tickets, messagesRedacted: raw.messages_redacted, attachmentsRemoved: raw.attachments_removed, redactedContent: raw.redacted_content }
  },

  /** CSV of all customers. Needs customers.view. */
  async exportCsv(): Promise<void> {
    await apiDownloadFile('/exports/customers', 'customers.csv')
  },
}

export interface EraseCustomerResult {
  tickets: number
  messagesRedacted: number
  attachmentsRemoved: number
  redactedContent: boolean
}
