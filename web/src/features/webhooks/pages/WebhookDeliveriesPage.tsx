import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageHeader } from '@/components/layout/PageHeader'
import type { DataTableColumn } from '@/components/tables/DataTable'
import { DataTable } from '@/components/tables/DataTable'
import { Pagination } from '@/components/tables/Pagination'
import { Badge } from '@/components/ui/Badge'
import { webhooksApi } from '@/features/webhooks/api/webhooksApi'
import { useWebhookDeliveries } from '@/features/webhooks/hooks/useWebhookDeliveries'
import type { Webhook, WebhookDelivery } from '@/features/webhooks/types'
import { formatDateTime } from '@/utils/datetime'

export function WebhookDeliveriesPage() {
  const { webhookId } = useParams<{ webhookId: string }>()
  const id = Number(webhookId)

  const [webhook, setWebhook] = useState<Webhook | null>(null)
  const [isLoadingWebhook, setIsLoadingWebhook] = useState(true)
  const [webhookError, setWebhookError] = useState<Error | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!id) return
    setIsLoadingWebhook(true)
    webhooksApi
      .get(id)
      .then(setWebhook)
      .catch((err: Error) => setWebhookError(err))
      .finally(() => setIsLoadingWebhook(false))
  }, [id])

  const { deliveries, meta, isLoading, error, refetch } = useWebhookDeliveries(id, { page, perPage: 25 })

  if (isLoadingWebhook) return <LoadingState label="Loading webhook…" />
  if (webhookError || !webhook) return <ErrorState description={webhookError?.message} />

  const columns: DataTableColumn<WebhookDelivery>[] = [
    { key: 'event', header: 'Event', render: (d) => <span className="font-code-sm text-code-sm text-on-surface">{d.event}</span> },
    {
      key: 'status',
      header: 'Result',
      render: (d) => (d.success ? <Badge tone="tertiary">Success</Badge> : <Badge tone="danger">Failed</Badge>),
    },
    {
      key: 'responseStatus',
      header: 'HTTP Status',
      render: (d) => d.responseStatus ?? <span className="text-secondary">—</span>,
    },
    { key: 'attempt', header: 'Attempt', render: (d) => `#${d.attempt}` },
    {
      key: 'attemptedAt',
      header: 'Attempted At',
      render: (d) => (d.attemptedAt ? formatDateTime(d.attemptedAt) : <span className="text-secondary">—</span>),
    },
  ]

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Integrations' }, { label: 'Webhooks', to: ROUTES.webhooks }, { label: webhook.name }]}
        title="Delivery Log"
        meta={<span className="font-code-sm text-code-sm text-secondary">{webhook.url}</span>}
      />

      <div className="px-gutter-lg">
        <DataTable
          columns={columns}
          rows={deliveries}
          getRowId={(d) => String(d.id)}
          isLoading={isLoading}
          error={error}
          onRetry={refetch}
          emptyTitle="No deliveries yet"
          emptyDescription="Delivery attempts will appear here once this webhook's subscribed events start firing."
        />
        {meta && <Pagination meta={meta} onPageChange={setPage} />}
      </div>
    </div>
  )
}
