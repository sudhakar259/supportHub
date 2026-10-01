export interface UserFilters {
  name?: string
  email?: string
  isActive?: boolean
  role?: string
  sort?: string
  page?: number
  perPage?: number
}

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  passwordConfirmation: string
  phone?: string
  role: string
  departmentIds?: number[]
}

export interface UpdateUserPayload {
  name?: string
  email?: string
  phone?: string
  timezone?: string
  isActive?: boolean
}

/** The 4 internal staff roles a user can be created with — Customer accounts are created via self-registration instead. */
export const STAFF_ROLES = ['Agent', 'Senior Agent', 'Department Manager', 'Administrator'] as const
