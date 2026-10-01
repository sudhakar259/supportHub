import { useCallback, useEffect, useState } from 'react'

import { ticketsApi } from '@/features/tickets/api/ticketsApi'
import type { PaginationMeta } from '@/types/pagination'
import type { Ticket, TicketFilters } from '@/types/ticket'

/** Fetches a filtered, paginated ticket list. Re-fetches whenever `filters` changes. */
export function useTickets(filters: TicketFilters) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    ticketsApi
      .list(filters)
      .then((page) => {
        if (cancelled) return
        setTickets(page.items)
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

  return { tickets, meta, isLoading, error, refetch }
}
