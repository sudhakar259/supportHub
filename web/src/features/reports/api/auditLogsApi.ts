import { apiFetchPage } from '@/services/api/client'
import type { RawUser } from '@/services/api/mappers'
import { mapUser } from '@/services/api/mappers'
import type { AuditLog, AuditLogFilters } from '@/types/auditLog'
import type { Paginated } from '@/types/pagination'

interface RawAuditLog {
  id: number
  actor?: RawUser | null
  actor_type: string | null
  action: string
  auditable_type: string | null
  auditable_id: string | number | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  created_at: string | null
}

function mapAuditLog(raw: RawAuditLog): AuditLog {
  return {
    id: raw.id,
    actor: raw.actor ? mapUser(raw.actor) : null,
    actorType: raw.actor_type,
    action: raw.action,
    auditableType: raw.auditable_type,
    auditableId: raw.auditable_id,
    oldValues: raw.old_values,
    newValues: raw.new_values,
    ipAddress: raw.ip_address,
    createdAt: raw.created_at,
  }
}

/** Maps 1:1 to GET /audit-logs — see AuditLogController.php for the exact contract. */
export const auditLogsApi = {
  async list(filters: AuditLogFilters = {}): Promise<Paginated<AuditLog>> {
    return apiFetchPage<RawAuditLog, AuditLog>('/audit-logs', mapAuditLog, {
      params: {
        'filter[action]': filters.action || undefined,
        'filter[actor_id]': filters.actorId,
        'filter[auditable_type]': filters.auditableType || undefined,
        sort: '-created_at',
        page: filters.page,
        per_page: filters.perPage,
      },
    })
  },
}
