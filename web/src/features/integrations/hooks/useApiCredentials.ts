import { useCallback, useEffect, useState } from 'react'

import { apiCredentialsApi } from '@/features/integrations/api/apiCredentialsApi'
import type { ApiCredential } from '@/features/integrations/types'

export function useApiCredentials() {
  const [credentials, setCredentials] = useState<ApiCredential[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    apiCredentialsApi
      .list()
      .then((items) => {
        if (!cancelled) setCredentials(items)
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

  return { credentials, isLoading, error, refetch }
}
