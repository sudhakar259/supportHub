import { useCallback, useEffect, useState } from 'react'

import { webhooksApi } from '@/features/webhooks/api/webhooksApi'
import type { Webhook } from '@/features/webhooks/types'

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    webhooksApi
      .list()
      .then((items) => {
        if (!cancelled) setWebhooks(items)
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
  }, [reloadToken])

  return { webhooks, isLoading, error, refetch }
}
