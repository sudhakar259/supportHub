import { useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Icon } from '@/components/ui/Icon'
import { ticketsApi } from '@/features/tickets/api/ticketsApi'
import type { TicketAttachment } from '@/types/ticket'

/** Downloads through the signed-in session; a bare link would reach the API without a token and get a 401. */
export function AttachmentLink({ attachment, icon = 'description' }: { attachment: TicketAttachment; icon?: string }) {
  const toast = useToast()
  const [isLoading, setIsLoading] = useState(false)

  async function handleClick() {
    setIsLoading(true)
    try {
      await ticketsApi.downloadAttachment(attachment)
    } catch (err) {
      toast.error('Download Failed', err instanceof Error ? err.message : undefined)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="inline-flex items-center gap-1.5 rounded bg-surface-container px-2.5 py-1 text-code-sm text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60"
    >
      <Icon name={isLoading ? 'progress_activity' : icon} size={16} className="text-primary" />
      <span>{attachment.originalFilename}</span>
    </button>
  )
}
