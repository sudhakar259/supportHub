import { useCallback, useEffect, useState } from 'react'

import { webhooksApi } from '@/features/webhooks/api/webhooksApi'
import type { WebhookDelivery } from '@/features/webhooks/types'
import type { PaginationMeta } from '@/types/pagination'

export interface WebhookDeliveryFilters {
  page: number
  perPage: number
}

export function useWebhookDeliveries(webhookId: number, filters: WebhookDeliveryFilters) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken((t) => t + 1), [])

  useEffect(() => {
    if (!webhookId) return
    let cancelled = false
    setIsLoading(true)
    setError(null)

    webhooksApi
      .listDeliveries(webhookId, filters)
      .then((page) => {
        if (cancelled) return
        setDeliveries(page.items)
        setMeta(page.meta)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [webhookId, JSON.stringify(filters), reloadToken])

  return { deliveries, meta, isLoading, error, refetch }
}
