export interface CategoryFormPayload {
  name: string
  slug?: string
  parentId?: number
  departmentId?: number
  description?: string
  isActive?: boolean
  sortOrder?: number
}
