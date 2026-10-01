import { useCallback, useEffect, useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { ticketsApi } from '@/features/tickets/api/ticketsApi'
import type { TicketMessage } from '@/types/ticket'

export function useTicketMessages(ticketId: string | undefined) {
  const toast = useToast()
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isPosting, setIsPosting] = useState(false)

  const load = useCallback(() => {
    if (!ticketId) return
    setIsLoading(true)
    setError(null)
    ticketsApi
      .listMessages(ticketId)
      .then((page) => setMessages(page.items))
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false))
  }, [ticketId])

  useEffect(() => {
    load()
  }, [load])

  const postMessage = useCallback(
    async (body: string, isInternal: boolean) => {
      if (!ticketId) return
      setIsPosting(true)
      try {
        const message = await ticketsApi.postMessage(ticketId, body, isInternal)
        setMessages((prev) => [...prev, message])
        toast.success(isInternal ? 'Internal Note Saved' : 'Reply Sent')
      } catch (err) {
        toast.error(isInternal ? 'Failed to Save Note' : 'Failed to Send Reply', err instanceof Error ? err.message : undefined)
        throw err
      } finally {
        setIsPosting(false)
      }
    },
    [ticketId, toast],
  )

  return { messages, isLoading, error, refetch: load, postMessage, isPosting }
}
