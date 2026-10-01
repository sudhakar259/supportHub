import { apiFetch, apiFetchPage } from '@/services/api/client'
import type { RawRole } from '@/services/api/mappers'
import { mapRole } from '@/services/api/mappers'
import type { Paginated } from '@/types/pagination'
import type { Permission, Role } from '@/types/role'

export interface RawPermission {
  id: number
  name: string
}

export interface RoleFormPayload {
  name?: string
  permissions?: string[]
}

/** Maps 1:1 to api/routes/api/roles.php — see RoleController.php for the exact contract. */
export const rolesApi = {
  async list(): Promise<Paginated<Role>> {
    return apiFetchPage<RawRole, Role>('/roles', mapRole, { params: { per_page: 100 } })
  },

  async get(id: number): Promise<Role> {
    const raw = await apiFetch<RawRole>(`/roles/${id}`)
    return mapRole(raw)
  },

  async create(payload: RoleFormPayload): Promise<Role> {
    const raw = await apiFetch<RawRole>('/roles', { method: 'POST', body: payload })
    return mapRole(raw)
  },

  async update(id: number, payload: RoleFormPayload): Promise<Role> {
    const raw = await apiFetch<RawRole>(`/roles/${id}`, { method: 'PUT', body: payload })
    return mapRole(raw)
  },

  async destroy(id: number): Promise<void> {
    await apiFetch<null>(`/roles/${id}`, { method: 'DELETE' })
  },
}

export const permissionsApi = {
  async list(): Promise<Permission[]> {
    // /permissions returns the full, unpaginated list (see PermissionController::index).
    const page = await apiFetchPage<RawPermission, Permission>('/permissions', (raw) => raw)
    return page.items
  },
}
