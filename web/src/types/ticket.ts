import type { Customer } from '@/types/customer'
import type { Department } from '@/types/department'
import type { User } from '@/types/user'

/** Mirrors api/app/Http/Resources/TicketStatusResource.php. Statuses are DB-driven, not a fixed enum. */
export interface TicketStatus {
  id: number
  name: string
  slug: string
  color: string
  isDefault: boolean
  isClosed: boolean
  sortOrder: number
}

/** Mirrors api/app/Http/Resources/TicketPriorityResource.php. Priorities are DB-driven, not a fixed enum. */
export interface TicketPriority {
  id: number
  name: string
  slug: string
  level: number
  color: string
  isDefault: boolean
}

/** Mirrors api/app/Http/Resources/TicketCategoryResource.php */
export interface TicketCategory {
  id: number
  name: string
  slug: string
  description: string | null
  parentId: number | null
  departmentId: number | null
  isActive: boolean
  sortOrder: number
  children: TicketCategory[]
}

export type SlaStatus = 'pending' | 'met' | 'breached' | 'paused'

/** Mirrors api/app/Http/Resources/TicketSlaResource.php */
export interface TicketSla {
  startedAt: string | null
  firstResponseDueAt: string | null
  resolutionDueAt: string | null
  firstResponseMetAt: string | null
  resolvedMetAt: string | null
  firstResponseBreached: boolean
  resolutionBreached: boolean
  status: SlaStatus
}

/** Mirrors api/app/Http/Resources/TicketAttachmentResource.php */
export interface TicketAttachment {
  id: string
  ticketMessageId: string | null
  originalFilename: string
  mimeType: string
  size: number
  uploader: User | null
  downloadUrl: string
  createdAt: string
}

export type TicketMessageType = 'customer_message' | 'agent_reply' | 'internal_note'

/** Mirrors api/app/Http/Resources/TicketMessageResource.php */
export interface TicketMessage {
  id: string
  ticketId: string
  type: TicketMessageType
  body: string
  author: User | null
  attachments: TicketAttachment[]
  createdAt: string
  updatedAt: string
}

/** Mirrors api/app/Http/Resources/TicketResource.php */
export interface Ticket {
  id: string
  ticketNumber: string
  subject: string
  description: string
  customer: Customer | null
  category: TicketCategory | null
  priority: TicketPriority | null
  status: TicketStatus | null
  department: Department | null
  assignee: User | null
  sla: TicketSla | null
  /** Files attached to the ticket itself (not to a reply). Only present on the single-ticket endpoint. */
  attachments: TicketAttachment[]
  tags: string[]
  reopenedCount: number
  firstResponseAt: string | null
  resolvedAt: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TicketFilters {
  statusId?: number
  priorityId?: number
  departmentId?: number
  assigneeId?: number
  customerId?: number
  search?: string
  slaStatus?: SlaStatus
  sort?: string
  page?: number
  perPage?: number
}

export interface CreateTicketPayload {
  subject: string
  description: string
  categoryId?: number
  priorityId?: number
  customerId?: number
}

export interface AssignTicketPayload {
  assigneeId: number
  departmentId?: number
  note?: string
}

export interface StatusActionPayload {
  reason?: string
}
