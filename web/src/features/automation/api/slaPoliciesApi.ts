import { apiFetch, apiFetchPage } from '@/services/api/client'
import type { RawDepartment } from '@/services/api/mappers'
import { mapDepartment } from '@/services/api/mappers'
import type { RawTicketPriority } from '@/features/tickets/api/ticketMappers'
import { mapTicketPriority } from '@/features/tickets/api/ticketMappers'
import type { SlaPolicy, SlaPolicyFormPayload } from '@/types/slaPolicy'

interface RawSlaPolicy {
  id: number
  name: string
  description: string | null
  priority?: RawTicketPriority | null
  department?: RawDepartment | null
  business_hours_id: number | null
  first_response_minutes: number
  resolution_minutes: number
  business_hours_only: boolean
  is_default: boolean
  is_active: boolean
  created_at: string | null
  updated_at: string | null
}

function mapSlaPolicy(raw: RawSlaPolicy): SlaPolicy {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    priority: raw.priority ? mapTicketPriority(raw.priority) : null,
    department: raw.department ? mapDepartment(raw.department) : null,
    businessHoursId: raw.business_hours_id,
    firstResponseMinutes: raw.first_response_minutes,
    resolutionMinutes: raw.resolution_minutes,
    businessHoursOnly: raw.business_hours_only,
    isDefault: raw.is_default,
    isActive: raw.is_active,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

function toBody(payload: Partial<SlaPolicyFormPayload>) {
  return {
    name: payload.name,
    description: payload.description,
    priority_id: payload.priorityId,
    department_id: payload.departmentId,
    first_response_minutes: payload.firstResponseMinutes,
    resolution_minutes: payload.resolutionMinutes,
    business_hours_only: payload.businessHoursOnly,
    is_default: payload.isDefault,
    is_active: payload.isActive,
  }
}

/** Maps 1:1 to api/routes/api/sla.php — see SlaPolicyController.php for the exact contract. */
export const slaPoliciesApi = {
  async list(): Promise<SlaPolicy[]> {
    const page = await apiFetchPage<RawSlaPolicy, SlaPolicy>('/sla-policies', mapSlaPolicy)
    return page.items
  },

  async create(payload: SlaPolicyFormPayload): Promise<SlaPolicy> {
    const raw = await apiFetch<RawSlaPolicy>('/sla-policies', { method: 'POST', body: toBody(payload) })
    return mapSlaPolicy(raw)
  },

  async update(id: number, payload: Partial<SlaPolicyFormPayload>): Promise<SlaPolicy> {
    const raw = await apiFetch<RawSlaPolicy>(`/sla-policies/${id}`, { method: 'PUT', body: toBody(payload) })
    return mapSlaPolicy(raw)
  },

  async destroy(id: number): Promise<void> {
    await apiFetch<null>(`/sla-policies/${id}`, { method: 'DELETE' })
  },
}
