export interface DepartmentFilters {
  name?: string
  isActive?: boolean
  sort?: string
  page?: number
  perPage?: number
}

export interface DepartmentFormPayload {
  name: string
  code: string
  description?: string
  managerId?: number
  isActive?: boolean
}
