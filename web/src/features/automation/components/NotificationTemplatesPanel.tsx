import { useEffect, useState } from 'react'

import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Badge } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/IconButton'
import { notificationTemplatesApi } from '@/features/automation/api/notificationTemplatesApi'
import { NotificationTemplateEditModal } from '@/features/automation/components/NotificationTemplateEditModal'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { hasPermission } from '@/types/user'
import type { NotificationTemplate } from '@/types/notification'

export function NotificationTemplatesPanel() {
  const { user } = useAuth()
  const canManage = hasPermission(user, 'notifications.manage')
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null)

  useEffect(() => {
    setIsLoading(true)
    notificationTemplatesApi
      .list()
      .then(setTemplates)
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false))
  }, [reloadToken])

  const refetch = () => setReloadToken((t) => t + 1)

  if (isLoading) return <LoadingState label="Loading notification templates…" />
  if (error) return <ErrorState description={error.message} onRetry={refetch} />

  return (
    <div className="flex flex-col gap-space-md">
      {templates.length === 0 ? (
        <p className="rounded-xl bg-surface-container-lowest p-space-md text-center text-body-sm text-on-surface-variant shadow-sm">
          No notification templates found.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-surface-container-low rounded-xl bg-surface-container-lowest shadow-sm">
          {templates.map((template) => (
            <div key={template.id} className="flex items-center justify-between gap-space-md p-space-md">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-title-sm font-bold text-on-surface">{template.name}</span>
                  <span className="font-code-sm text-code-sm text-secondary">{template.key}</span>
                  <Badge tone="neutral">{template.channel}</Badge>
                  {!template.isActive && <Badge tone="danger">Inactive</Badge>}
                </div>
                <p className="truncate text-body-sm text-on-surface-variant">{template.subject}</p>
              </div>
              {canManage && <IconButton icon="edit" label="Edit template" onClick={() => setEditingTemplate(template)} />}
            </div>
          ))}
        </div>
      )}

      <NotificationTemplateEditModal
        template={editingTemplate}
        onClose={() => setEditingTemplate(null)}
        onSaved={() => {
          setEditingTemplate(null)
          refetch()
        }}
      />
    </div>
  )
}
