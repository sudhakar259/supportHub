import type { CreateUserPayload, UpdateUserPayload, UserFilters } from '@/features/users/types'
import { apiFetch, apiFetchPage } from '@/services/api/client'
import type { RawUser } from '@/services/api/mappers'
import { mapUser } from '@/services/api/mappers'
import type { Paginated } from '@/types/pagination'
import type { User } from '@/types/user'

/** Maps 1:1 to api/routes/api/users.php — see UserController.php for the exact contract. */
export const usersApi = {
  async list(filters: UserFilters = {}): Promise<Paginated<User>> {
    return apiFetchPage<RawUser, User>('/users', mapUser, {
      params: {
        'filter[name]': filters.name || undefined,
        'filter[email]': filters.email || undefined,
        'filter[is_active]': filters.isActive,
        'filter[role]': filters.role,
        sort: filters.sort,
        page: filters.page,
        per_page: filters.perPage,
      },
    })
  },

  async get(id: number): Promise<User> {
    const raw = await apiFetch<RawUser>(`/users/${id}`)
    return mapUser(raw)
  },

  async create(payload: CreateUserPayload): Promise<User> {
    const raw = await apiFetch<RawUser>('/users', {
      method: 'POST',
      body: {
        name: payload.name,
        email: payload.email,
        password: payload.password || undefined,
        password_confirmation: payload.password ? payload.passwordConfirmation : undefined,
        phone: payload.phone || undefined,
        role: payload.role,
        department_ids: payload.departmentIds,
      },
    })
    return mapUser(raw)
  },

  async update(id: number, payload: UpdateUserPayload): Promise<User> {
    const raw = await apiFetch<RawUser>(`/users/${id}`, {
      method: 'PUT',
      body: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        timezone: payload.timezone,
        is_active: payload.isActive,
      },
    })
    return mapUser(raw)
  },

  /** "Login as" — returns a short-lived token for the target user. Needs users.impersonate. */
  async impersonate(id: number): Promise<{ user: User; token: string }> {
    const result = await apiFetch<{ user: RawUser; token: string }>(`/users/${id}/impersonate`, { method: 'POST' })
    return { user: mapUser(result.user), token: result.token }
  },

  /** Clears a lockout from too many failed sign-ins. Needs users.update. */
  async unlock(id: number): Promise<User> {
    return mapUser(await apiFetch<RawUser>(`/users/${id}/unlock`, { method: 'POST' }))
  },

  /** Switches off someone's two-factor authentication (lost phone) and signs them out everywhere. Needs users.update. */
  async resetTwoFactor(id: number): Promise<User> {
    return mapUser(await apiFetch<RawUser>(`/users/${id}/two-factor`, { method: 'DELETE' }))
  },

  async destroy(id: number): Promise<void> {
    await apiFetch<null>(`/users/${id}`, { method: 'DELETE' })
  },

  async syncRoles(id: number, roles: string[]): Promise<User> {
    const raw = await apiFetch<RawUser>(`/users/${id}/roles`, { method: 'PUT', body: { roles } })
    return mapUser(raw)
  },
}
