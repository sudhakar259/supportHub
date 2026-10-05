import { useCallback, useEffect, useState } from 'react'

import { subscriptionApi } from '@/features/billing/api/subscriptionApi'
import type { Invoice } from '@/features/billing/types'

interface InvoicesResult {
  token: number
  invoices: Invoice[]
  error: Error | null
}

export function useInvoices() {
  const [reloadToken, setReloadToken] = useState(0)
  const [result, setResult] = useState<InvoicesResult | null>(null)

  const refetch = useCallback(() => setReloadToken((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false

    subscriptionApi
      .listInvoices()
      .then((invoices) => {
        if (!cancelled) setResult({ token: reloadToken, invoices, error: null })
      })
      .catch((error: Error) => {
        if (!cancelled) setResult({ token: reloadToken, invoices: [], error })
      })

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const isCurrent = result?.token === reloadToken

  return {
    invoices: result?.invoices ?? [],
    isLoading: !isCurrent,
    error: isCurrent ? result?.error ?? null : null,
    refetch,
  }
}
