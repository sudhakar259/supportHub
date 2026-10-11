import { useEffect, useRef, useState } from 'react'

import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { authApi } from '@/features/auth/api/authApi'
import { tokenStorage } from '@/services/storage/tokenStorage'
import { workspaceUrl } from './workspace'

/** Moves older root-domain sessions into the tenant's canonical workspace. */
export function WorkspaceRedirect({ slug }: { slug: string }) {
  const started = useRef(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (started.current) return
    started.current = true
    const destination = workspaceUrl(slug)
    if (!destination) return
    void authApi.createWorkspaceHandoff().then(async (code) => {
      await authApi.logout()
      tokenStorage.clear()
      window.location.assign(`${destination}#workspace-session=${encodeURIComponent(code)}`)
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'We could not open your workspace. Please try again.')
    })
  }, [slug])

  return <div className="flex min-h-screen items-center justify-center p-space-lg">{error ? <ErrorState title="We could not open your workspace" description={error} onRetry={() => window.location.reload()} /> : <LoadingState label="Opening your team’s workspace…" />}</div>
}
