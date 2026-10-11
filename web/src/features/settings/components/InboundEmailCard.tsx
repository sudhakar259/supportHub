import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { useToast } from '@/components/feedback/ToastProvider'
import { Badge } from '@/components/ui/Badge'
import type { BadgeTone } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { Switch } from '@/components/ui/Switch'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { inboundEmailApi } from '@/features/settings/api/inboundEmailApi'
import type { InboundEmailState } from '@/features/settings/api/inboundEmailApi'
import { formatRelativeTime } from '@/utils/datetime'
import { hasPermission } from '@/types/user'

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  ticket_created: { label: 'Ticket created', tone: 'success' },
  reply_added: { label: 'Reply added', tone: 'success' },
  ignored_auto_generated: { label: 'Ignored: automatic mail', tone: 'neutral' },
  ignored_staff_sender: { label: 'Ignored: team member', tone: 'neutral' },
  rejected_disabled: { label: 'Rejected: feature off', tone: 'warning' },
  rejected_unknown_sender: { label: 'Rejected: unknown sender', tone: 'warning' },
  rejected_bad_sender: { label: 'Rejected: bad sender', tone: 'warning' },
  rejected_plan_limit: { label: 'Rejected: plan limit', tone: 'danger' },
  failed: { label: 'Failed', tone: 'danger' },
  processing: { label: 'Processing', tone: 'neutral' },
}

/** Turns emails sent to the workspace's address into tickets; shows the address, the switches and what happened to recent mail. */
export function InboundEmailCard() {
  const toast = useToast()
  const { user } = useAuth()
  const canManage = hasPermission(user, 'settings.manage')
  const [state, setState] = useState<InboundEmailState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(() => {
    inboundEmailApi
      .get()
      .then((result) => {
        setState(result)
        setError(null)
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function save(next: { enabled: boolean; createCustomers: boolean }) {
    setIsSaving(true)
    try {
      setState(await inboundEmailApi.update(next))
      toast.success('Email to Ticket Updated')
    } catch (err) {
      toast.error('Could Not Update', err instanceof Error ? err.message : undefined)
    } finally {
      setIsSaving(false)
    }
  }

  async function copyAddress() {
    if (!state?.address) return
    try {
      await navigator.clipboard.writeText(state.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could Not Copy', 'Select the address and copy it manually.')
    }
  }

  if (error) {
    return <p className="rounded-xl bg-error-container p-space-md text-body-sm text-on-error-container">Email to ticket: {error}</p>
  }
  if (!state) return null

  return (
    <section className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm" aria-labelledby="inbound-email-title">
      <div className="flex flex-wrap items-start justify-between gap-space-md">
        <div className="flex flex-col gap-1">
          <h2 id="inbound-email-title" className="flex items-center gap-2 text-title-md font-bold text-on-surface">
            <Icon name="forward_to_inbox" size={20} className="text-primary" />
            Email to ticket
          </h2>
          <p className="max-w-2xl text-body-sm text-on-surface-variant">
            Forward your support mailbox to the address below and every email becomes a ticket. When a customer replies to an email from SupportHub, the reply is added to the same ticket.
          </p>
        </div>
        <Switch
          label={state.enabled ? 'On' : 'Off'}
          checked={state.enabled}
          disabled={!canManage || isSaving || !state.available}
          onChange={(e) => save({ enabled: e.target.checked, createCustomers: state.createCustomers })}
        />
      </div>

      {!state.available ? (
        <p className="rounded-lg bg-surface-container-low p-space-md text-body-sm text-on-surface-variant">
          Email to ticket is not set up on this platform yet. The platform administrator needs to configure the inbound email domain first.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-label-md uppercase tracking-wider text-secondary">Your forwarding address</span>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded bg-surface-container px-3 py-1.5 text-code-sm text-on-surface">{state.address}</code>
              <button
                type="button"
                onClick={copyAddress}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-surface-container px-space-md text-title-sm text-on-surface hover:bg-surface-container-high"
              >
                <Icon name={copied ? 'check' : 'content_copy'} size={16} />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              In your mail provider, set up forwarding from your support address (for example support@yourcompany.com) to this address. Gmail and Microsoft send a confirmation email to it, and that email arrives here as a ticket.
            </p>
          </div>

          <Switch
            label="Create a customer when an unknown address emails in (otherwise those emails are rejected)"
            checked={state.createCustomers}
            disabled={!canManage || isSaving}
            onChange={(e) => save({ enabled: state.enabled, createCustomers: e.target.checked })}
          />

          <div className="flex flex-col gap-2">
            <h3 className="text-title-sm font-bold text-on-surface">Recent emails</h3>
            {state.recent.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">Nothing received yet. Send a test email to your support address.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-surface-container-low">
                {state.recent.map((row) => {
                  const status = STATUS[row.status] ?? { label: row.status, tone: 'neutral' as BadgeTone }
                  return (
                    <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-space-sm">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-title-sm font-semibold text-on-surface">{row.subject || '(no subject)'}</span>
                        <span className="truncate text-body-sm text-on-surface-variant">
                          {row.fromName ? `${row.fromName} · ` : ''}
                          {row.fromEmail} · {formatRelativeTime(row.receivedAt)}
                          {row.note ? ` · ${row.note}` : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={status.tone}>{status.label}</Badge>
                        {row.ticketId && (
                          <Link to={ROUTES.ticketDetails(row.ticketId)} className="text-body-sm font-semibold text-primary underline">
                            Open ticket
                          </Link>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  )
}
