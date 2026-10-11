import { useEffect, useId, useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Icon } from '@/components/ui/Icon'
import { ticketsApi } from '@/features/tickets/api/ticketsApi'

export interface TicketTagsEditorProps {
  ticketId: string
  tags: string[]
  /** Called with the saved tag names so the page can update its copy of the ticket. */
  onChange: (tags: string[]) => void
  readOnly?: boolean
}

const MAX_TAGS = 10

/** Chips with a small input: Enter or comma adds a tag, ✕ removes one. Each change is saved straight away. */
export function TicketTagsEditor({ ticketId, tags, onChange, readOnly = false }: TicketTagsEditorProps) {
  const toast = useToast()
  const listId = useId()
  const [draft, setDraft] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (readOnly) return
    ticketsApi.listTags().then(setSuggestions).catch(() => setSuggestions([]))
  }, [readOnly])

  async function save(next: string[]) {
    setIsSaving(true)
    try {
      onChange(await ticketsApi.setTags(ticketId, next))
    } catch (err) {
      toast.error('Could Not Update Tags', err instanceof Error ? err.message : undefined)
    } finally {
      setIsSaving(false)
    }
  }

  async function add() {
    const name = draft.trim().toLowerCase()
    setDraft('')
    if (!name || tags.includes(name)) return
    if (tags.length >= MAX_TAGS) {
      toast.error('Too Many Tags', `A ticket can have at most ${MAX_TAGS} tags.`)
      return
    }
    await save([...tags, name])
  }

  if (readOnly && tags.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5 pt-2">
      <span className="text-label-sm text-secondary uppercase">Tags</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded bg-surface-container px-2 py-0.5 text-code-sm text-on-surface">
            #{tag}
            {!readOnly && (
              <button
                type="button"
                aria-label={`Remove tag ${tag}`}
                disabled={isSaving}
                onClick={() => save(tags.filter((t) => t !== tag))}
                className="text-secondary hover:text-error disabled:opacity-50"
              >
                <Icon name="close" size={12} />
              </button>
            )}
          </span>
        ))}
        {!readOnly && (
          <>
            <input
              type="text"
              value={draft}
              list={listId}
              maxLength={30}
              disabled={isSaving}
              aria-label="Add a tag"
              placeholder={tags.length ? 'Add tag…' : 'Add a tag…'}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  void add()
                }
              }}
              onBlur={() => void add()}
              className="h-6 w-28 rounded bg-surface-container-low px-2 text-code-sm text-on-surface placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <datalist id={listId}>
              {suggestions
                .filter((s) => !tags.includes(s))
                .map((s) => (
                  <option key={s} value={s} />
                ))}
            </datalist>
          </>
        )}
      </div>
    </div>
  )
}
