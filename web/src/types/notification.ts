/** Mirrors api/app/Http/Resources/NotificationTemplateResource.php */
export interface NotificationTemplate {
  id: number
  key: string
  name: string
  subject: string
  body: string
  channel: string
  isActive: boolean
  updatedAt: string | null
}

export interface NotificationTemplateFormPayload {
  subject?: string
  body?: string
  isActive?: boolean
}

/** Variables the backend substitutes into a template's subject/body — see NotificationTemplateController's doc comment. */
export const NOTIFICATION_TEMPLATE_VARIABLES = [
  '{ticket_number}',
  '{customer_name}',
  '{agent_name}',
  '{department}',
  '{ticket_subject}',
  '{ticket_status}',
  '{ticket_priority}',
  '{ticket_url}',
] as const
