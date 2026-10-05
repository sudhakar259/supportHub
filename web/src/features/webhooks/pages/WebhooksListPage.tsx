import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { useToast } from '@/components/feedback/ToastProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { SecretReveal } from '@/components/security/SecretReveal'
import type { DataTableColumn } from '@/components/tables/DataTable'
import { DataTable } from '@/components/tables/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { webhooksApi } from '@/features/webhooks/api/webhooksApi'
import { WebhookFormModal } from '@/features/webhooks/components/WebhookFormModal'
import { useWebhooks } from '@/features/webhooks/hooks/useWebhooks'
import type { Webhook, WebhookEvent } from '@/features/webhooks/types'
import { hasPermission } from '@/types/user'
import { formatDateTime } from '@/utils/datetime'

interface PendingSecretReveal {
  webhookId: number
  secret: string
  events: WebhookEvent[]
}

export function WebhooksListPage() {
  const { user } = useAuth()
  const canManage = hasPermission(user, 'webhooks.manage')
  const { webhooks, isLoading, error, refetch } = useWebhooks()
  const toast = useToast()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null)
  const [deletingWebhook, setDeletingWebhook] = useState<Webhook | null>(null)
  const [pendingSecretReveal, setPendingSecretReveal] = useState<PendingSecretReveal | null>(null)
  const [testingId, setTestingId] = useState<number | null>(null)

  function openCreate() {
    setEditingWebhook(null)
    setIsFormOpen(true)
  }

  function openEdit(webhook: Webhook) {
    setEditingWebhook(webhook)
    setIsFormOpen(true)
  }

  async function handleTest(webhook: Webhook) {
    setTestingId(webhook.id)
    try {
      const delivery = await webhooksApi.test(webhook.id)
      if (delivery.success) {
        toast.success('Test webhook delivered', `Received HTTP ${delivery.responseStatus} from ${webhook.url}.`)
      } else {
        toast.error('Test webhook failed', `Received HTTP ${delivery.responseStatus ?? 'no response'} from ${webhook.url}.`)
      }
    } catch (err) {
      toast.error('Test webhook failed', err instanceof Error ? err.message : undefined)
    } finally {
      setTestingId(null)
    }
  }

  if (pendingSecretReveal) {
    return (
      <div className="flex flex-col gap-space-md pb-space-xl">
        <PageHeader breadcrumbs={[{ label: 'Integrations' }, { label: 'Webhooks' }]} title="Webhook Created" />
        <div className="max-w-3xl px-gutter-lg">
          <SecretReveal
            secret={pendingSecretReveal.secret}
            tags={pendingSecretReveal.events}
            tagsLabel="Subscribed Events"
            continueLabel="Continue to Webhooks"
            onContinue={() => {
              setPendingSecretReveal(null)
              refetch()
            }}
          />
        </div>
      </div>
    )
  }

  const columns: DataTableColumn<Webhook>[] = [
    { key: 'name', header: 'Name', render: (w) => <span className="font-bold text-on-surface">{w.name}</span> },
    {
      key: 'url',
      header: 'URL',
      render: (w) => <span className="block max-w-xs truncate font-code-sm text-code-sm text-secondary">{w.url}</span>,
    },
    {
      key: 'events',
      header: 'Events',
      render: (w) => (
        <div className="flex flex-wrap gap-1">
          {w.events.slice(0, 2).map((event) => (
            <span key={event} className="rounded bg-surface-container-high px-1.5 py-0.5 font-code-sm text-code-sm text-on-surface">
              {event}
            </span>
          ))}
          {w.events.length > 2 && <span className="text-label-sm text-secondary">+{w.events.length - 2} more</span>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (w) => (w.isActive ? <Badge tone="tertiary">Active</Badge> : <Badge tone="neutral">Inactive</Badge>),
    },
    {
      key: 'lastTriggered',
      header: 'Last Triggered',
      render: (w) => (w.lastTriggeredAt ? formatDateTime(w.lastTriggeredAt) : <span className="text-secondary">Never</span>),
    },
    {
      key: 'actions',
      header: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right whitespace-nowrap',
      render: (w) => (
        <div className="flex items-center justify-end gap-1">
          <Link to={ROUTES.webhookDeliveries(w.id)} className="text-label-sm font-bold uppercase text-primary hover:underline">
            Deliveries
          </Link>
          {canManage && (
            <>
              <IconButton
                icon="bolt"
                label="Send test event"
                onClick={() => handleTest(w)}
                disabled={testingId === w.id}
              />
              <IconButton icon="edit" label="Edit webhook" onClick={() => openEdit(w)} />
              <IconButton icon="delete" label="Delete webhook" onClick={() => setDeletingWebhook(w)} />
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Integrations' }, { label: 'Webhooks' }]}
        title="Webhooks"
        meta={<span className="rounded bg-surface-container px-2 py-0.5 text-code-sm text-secondary">{webhooks.length} total</span>}
        actions={
          canManage && (
            <Button leadingIcon="add" onClick={openCreate}>
              Create Webhook
            </Button>
          )
        }
      />

      <div className="px-gutter-lg">
        <DataTable
          columns={columns}
          rows={webhooks}
          getRowId={(w) => String(w.id)}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          emptyTitle="No webhooks configured"
          emptyDescription="Create a webhook to receive HTTP callbacks for ticket lifecycle events, signed with a per-webhook secret."
          rowClassName={(w) => (!w.isActive ? 'opacity-60' : undefined)}
        />
      </div>

      <WebhookFormModal
        isOpen={isFormOpen}
        webhook={editingWebhook}
        onClose={() => setIsFormOpen(false)}
        onSaved={refetch}
        onCreatedWithSecret={(webhookId, secret, events) => setPendingSecretReveal({ webhookId, secret, events })}
      />

      {deletingWebhook && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeletingWebhook(null)}
          title="Delete Webhook"
          description={`Delete "${deletingWebhook.name}"? It will immediately stop receiving events. This cannot be undone.`}
          successMessage={`"${deletingWebhook.name}" deleted.`}
          onConfirm={async () => {
            await webhooksApi.destroy(deletingWebhook.id)
            refetch()
          }}
        />
      )}
    </div>
  )
}
