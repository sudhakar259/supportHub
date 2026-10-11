import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { TextField } from '@/components/ui/TextField'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { OtpInput } from '@/features/auth/components/OtpInput'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ApiError } from '@/types/api'
import { isPlatformAdmin } from '@/types/user'

interface LocationState {
  challengeToken?: string
  from?: string
}

/**
 * Second step of signing in for accounts that have two-factor authentication on. The
 * password step hands us a short-lived challenge token; a correct code (or an unused
 * recovery code) from the person turns it into a session.
 */
export function TwoFactorAuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { completeTwoFactor } = useAuth()
  const state = location.state as LocationState | null
  const challengeToken = state?.challengeToken

  const [code, setCode] = useState('')
  const [recoveryCode, setRecoveryCode] = useState('')
  const [useRecovery, setUseRecovery] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reached without signing in first (or after a refresh, which drops the token): start over.
  if (!challengeToken) return <Navigate to={ROUTES.login} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const entered = useRecovery ? recoveryCode.trim() : code
    if (!entered || (!useRecovery && entered.length !== 6)) {
      setError(useRecovery ? 'Enter one of your recovery codes.' : 'Enter the 6-digit code from your authenticator app.')
      return
    }

    setIsVerifying(true)
    setError(null)
    try {
      const user = await completeTwoFactor({
        challengeToken: challengeToken as string,
        code: useRecovery ? undefined : code,
        recoveryCode: useRecovery ? entered : undefined,
      })
      navigate(
        state?.from ??
          (!user.emailVerifiedAt ? ROUTES.emailVerification : isPlatformAdmin(user) ? ROUTES.platformDashboard : ROUTES.dashboard),
        { replace: true },
      )
    } catch (err) {
      setCode('')
      setRecoveryCode('')
      setError(err instanceof ApiError ? (err.fieldError('code') ?? err.fieldError('recovery_code') ?? err.message) : 'Unable to reach the server. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <AuthLayout>
      <AuthCard maxWidthClassName="w-full max-w-xl">
        <div className="flex flex-col items-center text-center">
          <div className="mb-space-md flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container text-primary shadow-sm">
            <Icon name="phonelink_lock" size={28} filled />
          </div>
          <h1 className="text-headline-md font-bold tracking-tight">Two-step verification</h1>
          <p className="mt-space-xs max-w-md text-body-md text-secondary">
            {useRecovery
              ? 'Enter one of the recovery codes you saved when you turned on two-step verification. Each code works once.'
              : 'Enter the 6-digit code from your authenticator app.'}
          </p>
        </div>

        <form className="mt-space-xl space-y-space-lg" onSubmit={handleSubmit}>
          {error && (
            <p role="alert" className="rounded-lg bg-error-container p-space-md text-body-sm text-on-error-container">
              {error}
            </p>
          )}

          {useRecovery ? (
            <TextField
              label="Recovery code"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder="xxxxx-xxxxx"
              autoComplete="off"
              autoFocus
            />
          ) : (
            <OtpInput value={code} onChange={setCode} error={error !== null} />
          )}

          <Button type="submit" className="w-full" size="lg" isLoading={isVerifying} leadingIcon="security">
            Verify and sign in
          </Button>
        </form>

        <div className="mt-space-lg flex flex-col items-center gap-space-xs text-body-sm">
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => {
              setUseRecovery((v) => !v)
              setError(null)
            }}
          >
            {useRecovery ? 'Use my authenticator app instead' : 'I can’t use my authenticator app'}
          </button>
          <Link to={ROUTES.login} className="text-secondary hover:text-on-surface">
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}
