import type { Department } from '@/types/department'
import type { TicketPriority } from '@/types/ticket'

/** Mirrors api/app/Http/Resources/SlaPolicyResource.php */
export interface SlaPolicy {
  id: number
  name: string
  description: string | null
  priority: TicketPriority | null
  department: Department | null
  businessHoursId: number | null
  firstResponseMinutes: number
  resolutionMinutes: number
  businessHoursOnly: boolean
  isDefault: boolean
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
}

export interface SlaPolicyFormPayload {
  name: string
  description?: string
  priorityId?: number
  departmentId?: number
  firstResponseMinutes: number
  resolutionMinutes: number
  businessHoursOnly?: boolean
  isDefault?: boolean
  isActive?: boolean
}
