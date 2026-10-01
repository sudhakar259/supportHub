import type { CreateCustomerPayload, CustomerFilters, UpdateCustomerPayload } from '@/features/customers/types'
import { apiFetch, apiFetchPage } from '@/services/api/client'
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
}
