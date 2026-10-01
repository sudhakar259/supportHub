import { apiFetch, apiFetchPage } from '@/services/api/client'
import type { NotificationTemplate, NotificationTemplateFormPayload } from '@/types/notification'

interface RawNotificationTemplate {
  id: number
  key: string
  name: string
  subject: string
  body: string
  channel: string
  is_active: boolean
  updated_at: string | null
}

function mapNotificationTemplate(raw: RawNotificationTemplate): NotificationTemplate {
  return {
    id: raw.id,
    key: raw.key,
    name: raw.name,
    subject: raw.subject,
    body: raw.body,
    channel: raw.channel,
    isActive: raw.is_active,
    updatedAt: raw.updated_at,
  }
}

/** Maps 1:1 to api/routes/api/notifications.php — see NotificationTemplateController.php for the exact contract. */
export const notificationTemplatesApi = {
  async list(): Promise<NotificationTemplate[]> {
    const page = await apiFetchPage<RawNotificationTemplate, NotificationTemplate>('/notification-templates', mapNotificationTemplate)
    return page.items
  },

  async update(id: number, payload: NotificationTemplateFormPayload): Promise<NotificationTemplate> {
    const raw = await apiFetch<RawNotificationTemplate>(`/notification-templates/${id}`, {
      method: 'PUT',
      body: { subject: payload.subject, body: payload.body, is_active: payload.isActive },
    })
    return mapNotificationTemplate(raw)
  },
}
