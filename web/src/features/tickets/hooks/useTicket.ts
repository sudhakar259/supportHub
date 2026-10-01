import { useCallback, useEffect, useState } from 'react'

import { ticketsApi } from '@/features/tickets/api/ticketsApi'
import type { Ticket } from '@/types/ticket'

/** Fetches a single ticket by id and exposes a setter so actions (assign, escalate, …) can update it in place. */
export function useTicket(id: string | undefined) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken((t) => t + 1), [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setIsLoading(true)
    setError(null)

    ticketsApi
      .get(id)
      .then((result) => {
        if (!cancelled) setTicket(result)
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
  }, [id, reloadToken])

  return { ticket, setTicket, isLoading, error, refetch }
}
