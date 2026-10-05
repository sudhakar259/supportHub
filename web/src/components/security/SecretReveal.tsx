import { useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'

export interface SecretRevealField {
  label: string
  value: string
}

export interface SecretRevealProps {
  /** An extra non-secret identifier shown above the secret, e.g. an API credential's Client Key. Omit if there's none (e.g. webhooks). */
  primaryField?: SecretRevealField
  /** The plaintext secret itself. Only ever held here, in local component state — never written to any list/cache/storage. */
  secret: string
  tags: string[]
  tagsLabel: string
  onContinue: () => void
  continueLabel?: string
}

/**
 * One-time secret display, shared by API Credentials and Webhooks: masked/visible
 * toggle, copy-to-clipboard, an irreversibility warning, and an acknowledgement
 * checkbox gating the continue action. The secret prop is gone the moment this
 * component unmounts — it is never fetchable again from the API either.
 */
export function SecretReveal({ primaryField, secret, tags, tagsLabel, onContinue, continueLabel = 'Continue' }: SecretRevealProps) {
  const [isRevealed, setIsRevealed] = useState(true)
  const [acknowledged, setAcknowledged] = useState(false)
  const toast = useToast()

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied to clipboard`)
  }

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="flex items-start gap-space-md rounded-xl bg-surface-container-highest p-space-md shadow-sm">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary">
          <Icon name="lock" size={20} />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-sm">
            <span className="text-title-sm font-bold text-on-surface">One-Time Secret Notice</span>
            <span className="rounded-full bg-error-container px-2 py-0.5 text-label-sm font-bold uppercase text-on-error-container">
              Unrecoverable
            </span>
          </div>
          <p className="text-body-sm leading-relaxed text-on-surface-variant">
            This secret will <strong>never be displayed again</strong>. Copy and store it securely now — if it&rsquo;s
            lost, rotate for a new one.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
        {primaryField && (
          <div className="flex flex-col gap-1.5">
            <label className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">{primaryField.label}</label>
            <div className="flex items-center gap-space-sm rounded-lg bg-surface-container-low p-space-xs">
              <Icon name="vpn_key" size={18} className="ml-space-sm text-secondary" />
              <input
                readOnly
                value={primaryField.value}
                className="flex-1 bg-transparent px-space-xs py-1 font-code-sm text-code-sm text-on-surface focus:outline-none"
              />
              <Button variant="ghost" size="sm" leadingIcon="content_copy" onClick={() => copy(primaryField.value, primaryField.label)}>
                Copy
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-label-sm font-bold uppercase tracking-wider text-primary">Secret</label>
            <span className="rounded-full bg-error px-2 py-0.5 text-label-sm font-bold uppercase text-on-error">Sensitive</span>
          </div>
          <div className="flex items-center gap-space-sm rounded-lg bg-surface-container-low p-space-xs">
            <Icon name="key" size={18} className="ml-space-sm text-primary" />
            <input
              readOnly
              value={isRevealed ? secret : '•'.repeat(40)}
              className="flex-1 bg-transparent px-space-xs py-1 font-code-sm text-code-sm font-bold text-on-surface focus:outline-none"
            />
            <IconButton
              icon={isRevealed ? 'visibility_off' : 'visibility'}
              label="Toggle secret visibility"
              onClick={() => setIsRevealed((v) => !v)}
            />
            <Button size="sm" leadingIcon="content_copy" onClick={() => copy(secret, 'Secret')}>
              Copy
            </Button>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-label-sm font-bold uppercase tracking-wider text-on-surface-variant">{tagsLabel}</span>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1.5 rounded-md bg-surface-container-high px-2.5 py-1 font-code-sm text-code-sm text-on-surface"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <Checkbox
        checked={acknowledged}
        onChange={(e) => setAcknowledged(e.target.checked)}
        label="I have copied and securely stored this secret. I understand it will not be shown again."
      />

      <Button disabled={!acknowledged} onClick={onContinue} trailingIcon="arrow_forward" className="self-start">
        {continueLabel}
      </Button>
    </div>
  )
}
