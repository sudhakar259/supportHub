import { useCallback, useEffect, useState } from 'react'

import { auditLogsApi } from '@/features/reports/api/auditLogsApi'
import type { AuditLog, AuditLogFilters } from '@/types/auditLog'
import type { PaginationMeta } from '@/types/pagination'

export function useAuditLogs(filters: AuditLogFilters) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    auditLogsApi
      .list(filters)
      .then((page) => {
        if (cancelled) return
        setLogs(page.items)
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

  return { logs, meta, isLoading, error, refetch }
}
