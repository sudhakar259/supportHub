import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { AttachmentPicker } from '@/features/tickets/components/AttachmentPicker'
import { cn } from '@/utils/cn'

export interface ReplyComposerProps {
  recipientEmail?: string
  onSubmit: (body: string, isInternal: boolean, files: File[]) => Promise<void>
  isSubmitting: boolean
  canPostInternalNotes: boolean
  /**
   * The backend rejects writes (replies, edits, internal notes) to a closed
   * ticket (see TicketPolicy::update()/createInternalNote()) — previously
   * this composer rendered fully active regardless, so a customer's reply
   * (or, before the matching backend fix, a staff member's) would silently
   * 403/fail with no advance warning. QA finding, 2026-10-01.
   */
  isTicketClosed?: boolean
}

export function ReplyComposer({
  recipientEmail,
  onSubmit,
  isSubmitting,
  canPostInternalNotes,
  isTicketClosed = false,
}: ReplyComposerProps) {
  const [mode, setMode] = useState<'public' | 'internal'>('public')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])

  async function handleSend() {
    if (!body.trim() || isTicketClosed) return
    await onSubmit(body, mode === 'internal', files)
    setBody('')
    setFiles([])
  }

  const isInternal = mode === 'internal'

  if (isTicketClosed) {
    return (
      <section className="flex items-center gap-space-sm rounded bg-surface-container-low px-space-md py-space-md text-body-md text-on-surface-variant shadow-md">
        <Icon name="lock" size={18} />
        This ticket is closed and can no longer be replied to. Reopen it to continue the conversation.
      </section>
    )
  }

  return (
    <section className={cn('overflow-hidden rounded shadow-md', isInternal ? 'bg-primary-fixed/10' : 'bg-surface-container-lowest')}>
      <div className="flex items-center justify-between bg-surface-container-low px-space-md py-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('public')}
            className={cn(
              'flex items-center gap-1.5 rounded px-space-md py-1.5 text-title-sm font-bold transition-all',
              mode === 'public' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface',
            )}
          >
            <Icon name="public" size={16} className="text-primary" />
            Public Reply
          </button>
          {canPostInternalNotes && (
            <button
              type="button"
              onClick={() => setMode('internal')}
              className={cn(
                'flex items-center gap-1.5 rounded px-space-md py-1.5 text-title-sm font-bold transition-all',
                mode === 'internal' ? 'bg-primary-container text-on-primary shadow-sm' : 'text-secondary hover:text-on-surface',
              )}
            >
              <Icon name="lock" size={16} />
              Internal Staff Note
            </button>
          )}
        </div>
        {recipientEmail && mode === 'public' && (
          <div className="flex items-center gap-2">
            <span className="text-label-sm text-secondary">To:</span>
            <span className="rounded bg-surface-container px-2 py-0.5 text-label-sm font-semibold text-on-surface">
              {recipientEmail}
            </span>
          </div>
        )}
      </div>

      <div className="px-space-md py-space-sm">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              void handleSend()
            }
          }}
          rows={5}
          placeholder={
            isInternal
              ? 'Type a private internal note for staff... (hidden from customer)'
              : 'Type your response... Use ⌘+Enter to send.'
          }
          className="w-full resize-y rounded bg-surface-container-low/40 p-space-md text-body-md text-on-surface placeholder:text-secondary focus:bg-surface-container-lowest focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-container-low px-space-md py-space-sm">
        <AttachmentPicker files={files} onChange={setFiles} disabled={isSubmitting} />
        <Button
          variant={isInternal ? 'secondary' : 'primary'}
          leadingIcon={isInternal ? 'lock' : 'send'}
          isLoading={isSubmitting}
          disabled={!body.trim()}
          onClick={handleSend}
        >
          {isInternal ? 'Save Internal Note' : 'Send Reply'}
        </Button>
      </div>
    </section>
  )
}
