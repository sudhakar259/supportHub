import { useCallback, useEffect, useState } from 'react'

import { platformTenantsApi } from '@/features/platform/api/platformTenantsApi'
import type { AdminTenant, AdminTenantFilters } from '@/features/platform/types'
import type { PaginationMeta } from '@/types/pagination'

export function useAdminTenants(filters: AdminTenantFilters) {
  const [tenants, setTenants] = useState<AdminTenant[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    platformTenantsApi
      .list(filters)
      .then((page) => {
        if (cancelled) return
        setTenants(page.items)
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
  }, [JSON.stringify(filters), reloadToken])

  return { tenants, meta, isLoading, error, refetch }
}
