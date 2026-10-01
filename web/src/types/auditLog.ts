import type { User } from '@/types/user'

/** Mirrors api/app/Http/Resources/AuditLogResource.php */
export interface AuditLog {
  id: number
  actor: User | null
  actorType: string | null
  action: string
  auditableType: string | null
  auditableId: string | number | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string | null
}

export interface AuditLogFilters {
  action?: string
  actorId?: number
  auditableType?: string
  page?: number
  perPage?: number
}
