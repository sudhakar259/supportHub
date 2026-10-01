import { useCallback, useEffect, useState } from 'react'

import { customersApi } from '@/features/customers/api/customersApi'
import type { CustomerFilters } from '@/features/customers/types'
import type { Customer } from '@/types/customer'
import type { PaginationMeta } from '@/types/pagination'

export function useCustomers(filters: CustomerFilters) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    customersApi
      .list(filters)
      .then((page) => {
        if (cancelled) return
        setCustomers(page.items)
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
    // `filters` is a plain JSON-serializable object; callers typically pass a fresh
    // literal each render, so compare by value instead of by reference.
  }, [JSON.stringify(filters), reloadToken])

  return { customers, meta, isLoading, error, refetch }
}
