/** Mirrors api/app/Models/Webhook.php::EVENTS — a fixed enum, not a DB-backed list. */
export type WebhookEvent =
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.assigned'
  | 'ticket.replied'
  | 'ticket.status_changed'
  | 'ticket.resolved'
  | 'ticket.closed'
  | 'ticket.reopened'

export interface Webhook {
  id: number
  name: string
  url: string
  events: WebhookEvent[]
  isActive: boolean
  lastTriggeredAt: string | null
  createdAt: string | null
}

export interface WebhookFormPayload {
  name: string
  url: string
  events: WebhookEvent[]
  isActive: boolean
}

export interface WebhookDelivery {
  id: number
  event: string
  responseStatus: number | null
  success: boolean
  attempt: number
  attemptedAt: string | null
}

/** Display descriptions for the fixed event enum — UI copy we own, not server data. */
export const WEBHOOK_EVENTS: { event: WebhookEvent; description: string }[] = [
  { event: 'ticket.created', description: 'Fires when a new ticket is opened.' },
  { event: 'ticket.updated', description: 'Fires when ticket details (subject, description, category, priority) change.' },
  { event: 'ticket.assigned', description: 'Fires when a ticket is assigned or reassigned to an agent.' },
  { event: 'ticket.replied', description: 'Fires when a new reply is posted in a ticket thread.' },
  { event: 'ticket.status_changed', description: 'Fires whenever a ticket moves to a different status.' },
  { event: 'ticket.resolved', description: 'Fires when a ticket is marked resolved.' },
  { event: 'ticket.closed', description: 'Fires when a ticket is closed.' },
  { event: 'ticket.reopened', description: 'Fires when a closed or resolved ticket is reopened.' },
]
