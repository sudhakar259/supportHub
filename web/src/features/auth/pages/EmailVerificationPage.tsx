import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { authApi } from '@/features/auth/api/authApi'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ApiError } from '@/types/api'

export function EmailVerificationPage() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()

  const [isResending, setIsResending] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleResend() {
    setIsResending(true)
    setError(null)
    setNotice(null)
    try {
      await authApi.resendVerification()
      setNotice('Verification link sent — check your inbox and spam folder.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  async function handleContinue() {
    setIsChecking(true)
    setError(null)
    try {
      const refreshed = await authApi.me()
      setUser(refreshed)
      if (refreshed.emailVerifiedAt) {
        navigate(ROUTES.dashboard)
      } else {
        setError('Still not verified — click the link in the email first, then try again.')
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <AuthLayout>
      <AuthCard maxWidthClassName="w-full max-w-2xl" accentClassName="bg-primary-container">
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-space-lg">
            <div className="absolute inset-0 animate-pulse rounded-2xl bg-primary/20 blur-md" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-container shadow-sm">
              <Icon name="mark_email_unread" size={36} />
              <div className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-container shadow-md ring-4 ring-surface-container-lowest">
                <Icon name="lock" size={16} filled className="text-on-primary-container" />
              </div>
            </div>
          </div>
          <h1 className="mb-space-xs text-headline-lg tracking-tight">Check your inbox</h1>
          <p className="mb-space-md text-body-md text-on-surface-variant">We sent a verification link to</p>
          <div className="mb-space-lg inline-flex items-center gap-space-sm rounded-full bg-surface-container-low px-space-md py-1.5">
            <Icon name="mail" size={16} className="text-secondary" />
            <span className="text-title-sm font-semibold">{user?.email ?? 'your registered email'}</span>
          </div>

          {notice && (
            <div className="mb-space-md flex w-full items-center gap-space-sm rounded-lg bg-surface-container p-space-md text-left">
              <Icon name="verified" size={20} className="shrink-0 text-tertiary" />
              <span className="text-body-sm text-on-surface">{notice}</span>
            </div>
          )}
          {error && (
            <div className="mb-space-md flex w-full items-start gap-space-sm rounded-lg bg-error-container/40 p-space-md text-left">
              <Icon name="error" size={20} className="shrink-0 text-error" />
              <span className="text-body-sm text-on-surface-variant">{error}</span>
            </div>
          )}

          <div className="flex w-full max-w-sm flex-col gap-space-sm">
            <Button className="w-full" size="lg" trailingIcon="arrow_forward" isLoading={isChecking} onClick={handleContinue}>
              I&rsquo;ve verified my email
            </Button>
            <Button variant="ghost" className="w-full" isLoading={isResending} leadingIcon="refresh" onClick={handleResend}>
              Resend verification link
            </Button>
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}
