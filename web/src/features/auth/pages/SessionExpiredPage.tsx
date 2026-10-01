import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { PasswordField } from '@/components/ui/PasswordField'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ApiError } from '@/types/api'

interface LocationState {
  from?: string
}

export function SessionExpiredPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = (location.state as LocationState | null)?.from ?? ROUTES.dashboard

  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.email) {
      navigate(ROUTES.login)
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      await login({ email: user.email, password })
      navigate(redirectTo)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="relative w-full max-w-2xl">
        <AuthCard maxWidthClassName="w-full" accentClassName="bg-primary-container">
          <div className="flex flex-col gap-space-lg">
            <div className="flex flex-col items-start justify-between gap-space-md sm:flex-row sm:items-center">
              <div className="flex items-center gap-space-md">
                <div className="relative flex h-14 w-14 items-center justify-center rounded-lg bg-inverse-surface shadow-md">
                  <Icon name="hourglass_top" size={30} filled className="text-primary-fixed" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-space-xs">
                    <Badge tone="danger">Session Locked</Badge>
                  </div>
                  <h1 className="mt-0.5 text-headline-md tracking-tight">Session Expired due to Inactivity</h1>
                </div>
              </div>
            </div>

            <p className="text-body-md text-on-surface-variant">
              For your security, your active session timed out after a period of inactivity. Confirm your credentials to resume
              your workspace.
            </p>

            <div className="flex items-start gap-space-md rounded-lg bg-surface-container-low p-space-md">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tertiary-container">
                <Icon name="verified_user" size={18} className="text-on-tertiary-container" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-title-sm text-on-surface">Auto-Saved State Intact</span>
                <p className="text-body-sm text-on-surface-variant">
                  Your draft replies and unsaved changes have been preserved locally.
                </p>
              </div>
            </div>

            {user && (
              <div className="flex flex-col gap-space-md rounded-lg bg-inverse-surface p-space-md text-inverse-on-surface">
                <div className="flex items-center gap-space-md">
                  <Avatar name={user.name} src={user.avatarPath} size={48} />
                  <div className="flex flex-col">
                    <span className="text-title-md">{user.name}</span>
                    <span className="text-body-sm text-secondary-fixed-dim">{user.email}</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-space-md rounded-lg bg-error-container p-space-md text-on-error-container">
                <Icon name="error" size={20} className="mt-0.5 text-error" />
                <div className="flex-1 text-body-sm">{error}</div>
              </div>
            )}

            <form className="mt-space-xs flex flex-col gap-space-md" onSubmit={handleSubmit}>
              <PasswordField
                label="Confirm Security Password"
                required
                placeholder="Enter password to quickly restore session"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leadingIcon={<Icon name="lock" size={20} />}
                autoComplete="current-password"
              />
              <div className="flex flex-col items-center justify-between gap-space-md pt-space-xs sm:flex-row">
                <Link
                  to={ROUTES.login}
                  className="inline-flex items-center gap-space-xs text-title-sm text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  <Icon name="switch_account" size={18} />
                  <span>Not {user?.name.split(' ')[0] ?? 'you'}? Sign in with a different account</span>
                </Link>
                <Button type="submit" size="lg" className="w-full sm:w-auto" isLoading={isSubmitting} trailingIcon="arrow_forward">
                  Re-authenticate &amp; Resume
                </Button>
              </div>
            </form>
          </div>
        </AuthCard>
      </div>
    </AuthLayout>
  )
}
