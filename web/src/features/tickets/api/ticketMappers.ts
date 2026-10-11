import type { RawCustomer, RawDepartment, RawUser } from '@/services/api/mappers'
import { mapCustomer, mapDepartment, mapUser } from '@/services/api/mappers'
import type {
  Ticket,
  TicketAttachment,
  TicketCategory,
  TicketMessage,
  TicketMessageType,
  TicketPriority,
  TicketSla,
  TicketStatus,
} from '@/types/ticket'

export interface RawTicketStatus {
  id: number
  name: string
  slug: string
  color: string
  is_default: boolean
  is_closed: boolean
  sort_order: number
}

export interface RawTicketPriority {
  id: number
  name: string
  slug: string
  level: number
  color: string
  is_default: boolean
}

export interface RawTicketCategory {
  id: number
  name: string
  slug: string
  description: string | null
  parent_id: number | null
  department_id: number | null
  is_active: boolean
  sort_order: number
  children?: RawTicketCategory[]
}

export interface RawTicketSla {
  started_at: string | null
  first_response_due_at: string | null
  resolution_due_at: string | null
  first_response_met_at: string | null
  resolved_met_at: string | null
  first_response_breached: boolean
  resolution_breached: boolean
  status: TicketSla['status']
}

export interface RawTicketAttachment {
  id: string
  ticket_message_id: string | null
  original_filename: string
  mime_type: string
  size: number
  uploader?: RawUser | null
  download_url: string
  created_at: string
}

export interface RawTicketMessage {
  id: string
  ticket_id: string
  type: TicketMessageType
  body: string
  author?: RawUser | null
  attachments?: RawTicketAttachment[]
  created_at: string
  updated_at: string
}

export interface RawTicket {
  id: string
  ticket_number: string
  subject: string
  description: string
  attachments?: RawTicketAttachment[]
  customer?: RawCustomer | null
  category?: RawTicketCategory | null
  priority?: RawTicketPriority | null
  status?: RawTicketStatus | null
  department?: RawDepartment | null
  assignee?: RawUser | null
  sla?: RawTicketSla | null
  tags?: string[]
  reopened_count: number
  first_response_at: string | null
  resolved_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export function mapTicketStatus(raw: RawTicketStatus): TicketStatus {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    color: raw.color,
    isDefault: raw.is_default,
    isClosed: raw.is_closed,
    sortOrder: raw.sort_order,
  }
}

export function mapTicketPriority(raw: RawTicketPriority): TicketPriority {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    level: raw.level,
    color: raw.color,
    isDefault: raw.is_default,
  }
}

export function mapTicketCategory(raw: RawTicketCategory): TicketCategory {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    parentId: raw.parent_id,
    departmentId: raw.department_id,
    isActive: raw.is_active,
    sortOrder: raw.sort_order,
    children: (raw.children ?? []).map(mapTicketCategory),
  }
}

export function mapTicketSla(raw: RawTicketSla): TicketSla {
  return {
    startedAt: raw.started_at,
    firstResponseDueAt: raw.first_response_due_at,
    resolutionDueAt: raw.resolution_due_at,
    firstResponseMetAt: raw.first_response_met_at,
    resolvedMetAt: raw.resolved_met_at,
    firstResponseBreached: raw.first_response_breached,
    resolutionBreached: raw.resolution_breached,
    status: raw.status,
  }
}

export function mapTicketAttachment(raw: RawTicketAttachment): TicketAttachment {
  return {
    id: raw.id,
    ticketMessageId: raw.ticket_message_id,
    originalFilename: raw.original_filename,
    mimeType: raw.mime_type,
    size: raw.size,
    uploader: raw.uploader ? mapUser(raw.uploader) : null,
    downloadUrl: raw.download_url,
    createdAt: raw.created_at,
  }
}

export function mapTicketMessage(raw: RawTicketMessage): TicketMessage {
  return {
    id: raw.id,
    ticketId: raw.ticket_id,
    type: raw.type,
    body: raw.body,
    author: raw.author ? mapUser(raw.author) : null,
    attachments: (raw.attachments ?? []).map(mapTicketAttachment),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

export function mapTicket(raw: RawTicket): Ticket {
  return {
    id: raw.id,
    ticketNumber: raw.ticket_number,
    subject: raw.subject,
    description: raw.description,
    customer: raw.customer ? mapCustomer(raw.customer) : null,
    category: raw.category ? mapTicketCategory(raw.category) : null,
    priority: raw.priority ? mapTicketPriority(raw.priority) : null,
    status: raw.status ? mapTicketStatus(raw.status) : null,
    department: raw.department ? mapDepartment(raw.department) : null,
    assignee: raw.assignee ? mapUser(raw.assignee) : null,
    sla: raw.sla ? mapTicketSla(raw.sla) : null,
    attachments: (raw.attachments ?? []).map(mapTicketAttachment),
    tags: raw.tags ?? [],
    reopenedCount: raw.reopened_count,
    firstResponseAt: raw.first_response_at,
    resolvedAt: raw.resolved_at,
    closedAt: raw.closed_at,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}
