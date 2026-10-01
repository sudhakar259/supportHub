export interface CustomerFilters {
  customerType?: string
  companyName?: string
  sort?: string
  page?: number
  perPage?: number
}

export interface CreateCustomerPayload {
  name: string
  email: string
  password: string
  passwordConfirmation: string
  phone?: string
  companyName?: string
  customerType?: 'individual' | 'business' | 'vip'
}

export interface UpdateCustomerPayload {
  phone?: string
  companyName?: string
  customerType?: 'individual' | 'business' | 'vip'
  timezone?: string
}

export const CUSTOMER_TYPES = ['individual', 'business', 'vip'] as const
