import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { LoadingState } from '@/components/feedback/LoadingState'
import { authApi } from '@/features/auth/api/authApi'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { tokenStorage } from '@/services/storage/tokenStorage'

export function WorkspaceSessionLanding({ code }: { code: string }) {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const exchange = useRef<ReturnType<typeof authApi.exchangeWorkspaceSession> | null>(null)
  const [error, setError] = useState<string>()

  useEffect(() => {
    // Remove the temporary code from the address bar before any further navigation.
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
    exchange.current ??= authApi.exchangeWorkspaceSession(code)
    let active = true
    void exchange.current.then(({ user, token }) => {
      if (!active) return
      tokenStorage.set(token)
      setUser(user)
      navigate(user.emailVerifiedAt ? ROUTES.dashboard : ROUTES.emailVerification, { replace: true, state: { fromRegistration: true } })
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'We could not open your workspace. Please sign in.')
    })
    return () => { active = false }
  }, [code, navigate, setUser])

  return <AuthLayout>{error ? <div className="max-w-xl text-center"><p role="alert" className="text-error">{error}</p><Link to={ROUTES.login} className="marketing-button mt-space-lg">Sign in to workspace</Link></div> : <LoadingState label="Opening your workspace…" />}</AuthLayout>
}
