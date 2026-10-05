import { useCallback, useEffect, useState } from 'react'

import { subscriptionApi } from '@/features/billing/api/subscriptionApi'
import type { Subscription } from '@/features/billing/types'

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    subscriptionApi
      .get()
      .then((sub) => {
        if (!cancelled) setSubscription(sub)
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

  return { subscription, isLoading, error, refetch, setSubscription }
}
