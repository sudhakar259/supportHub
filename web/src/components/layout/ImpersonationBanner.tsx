import { useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/features/auth/hooks/useAuth'

/** Always-visible reminder (and exit) while an administrator is acting as another user. */
export function ImpersonationBanner() {
  const { user, impersonator, stopImpersonation } = useAuth()
  const [isLeaving, setIsLeaving] = useState(false)

  if (!impersonator || !user) return null

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-space-md rounded-full bg-inverse-surface px-space-md py-2 text-inverse-on-surface shadow-lg"
    >
      <Icon name="visibility" size={18} />
      <span className="truncate text-title-sm">
        Viewing as <strong>{user.name}</strong>
        {user.roles[0] ? ` (${user.roles[0]})` : ''} · signed in by {impersonator.name}
      </span>
      <button
        type="button"
        disabled={isLeaving}
        onClick={() => {
          setIsLeaving(true)
          void stopImpersonation()
        }}
        className="shrink-0 rounded-full bg-primary px-3 py-1 text-label-sm font-semibold text-on-primary uppercase tracking-wider hover:bg-primary-container disabled:opacity-50"
      >
        Return to my account
      </button>
    </div>
  )
}
