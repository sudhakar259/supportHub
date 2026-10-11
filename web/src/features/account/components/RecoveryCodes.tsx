import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

/** The one-time view of the recovery codes. They are not shown again, so saving them is the point of this card. */
export function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopied(true)
    } catch {
      /* clipboard blocked — the codes are still on screen and can be downloaded */
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([`DeskZeal recovery codes\n\n${codes.join('\n')}\n`], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'deskzeal-recovery-codes.txt'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-start gap-space-sm rounded-lg bg-primary-fixed p-space-md text-on-primary-fixed">
        <Icon name="warning" size={20} className="mt-0.5 shrink-0" />
        <p className="text-body-sm">
          Save these recovery codes somewhere safe, like a password manager. If you lose your phone, each code lets you sign in once. <strong>They will not be shown again.</strong>
        </p>
      </div>
      <ul aria-label="Recovery codes" className="grid grid-cols-2 gap-space-xs rounded-lg bg-surface-container-low p-space-md font-code-sm text-code-sm text-on-surface sm:grid-cols-4">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-space-sm">
        <Button variant="secondary" leadingIcon={copied ? 'check' : 'content_copy'} onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button variant="secondary" leadingIcon="download" onClick={download}>
          Download
        </Button>
        <Button leadingIcon="check_circle" onClick={onDone}>
          I have saved them
        </Button>
      </div>
    </div>
  )
}
