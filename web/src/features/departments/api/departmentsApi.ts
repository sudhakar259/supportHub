import type { DepartmentFilters, DepartmentFormPayload } from '@/features/departments/types'
import { apiFetch, apiFetchPage } from '@/services/api/client'
import type { RawDepartment } from '@/services/api/mappers'
import { mapDepartment } from '@/services/api/mappers'
import type { Department } from '@/types/department'
import type { Paginated } from '@/types/pagination'

/** Maps 1:1 to api/routes/api/departments.php — see DepartmentController.php for the exact contract. */
export const departmentsApi = {
  async list(filters: DepartmentFilters = {}): Promise<Paginated<Department>> {
    return apiFetchPage<RawDepartment, Department>('/departments', mapDepartment, {
      params: {
        'filter[name]': filters.name || undefined,
        'filter[is_active]': filters.isActive,
        sort: filters.sort,
        page: filters.page,
        per_page: filters.perPage,
      },
    })
  },

  async get(id: number): Promise<Department> {
    const raw = await apiFetch<RawDepartment>(`/departments/${id}`)
    return mapDepartment(raw)
  },

  async create(payload: DepartmentFormPayload): Promise<Department> {
    const raw = await apiFetch<RawDepartment>('/departments', {
      method: 'POST',
      body: { name: payload.name, code: payload.code, description: payload.description, manager_id: payload.managerId, is_active: payload.isActive },
    })
    return mapDepartment(raw)
  },

  async update(id: number, payload: Partial<DepartmentFormPayload>): Promise<Department> {
    const raw = await apiFetch<RawDepartment>(`/departments/${id}`, {
      method: 'PUT',
      body: { name: payload.name, code: payload.code, description: payload.description, manager_id: payload.managerId, is_active: payload.isActive },
    })
    return mapDepartment(raw)
  },

  async destroy(id: number): Promise<void> {
    await apiFetch<null>(`/departments/${id}`, { method: 'DELETE' })
  },

  async assignUser(departmentId: number, userId: number, isPrimary = false): Promise<Department> {
    const raw = await apiFetch<RawDepartment>(`/departments/${departmentId}/users`, {
      method: 'POST',
      body: { user_id: userId, is_primary: isPrimary },
    })
    return mapDepartment(raw)
  },

  async removeUser(departmentId: number, userId: number): Promise<void> {
    await apiFetch<null>(`/departments/${departmentId}/users/${userId}`, { method: 'DELETE' })
  },
}
