import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { PasswordField } from '@/components/ui/PasswordField'
import { TextField } from '@/components/ui/TextField'
import { authApi } from '@/features/auth/api/authApi'
import { DEFAULT_PASSWORD_REQUIREMENTS, PasswordStrengthMeter, passwordScore } from '@/features/auth/components/PasswordStrengthMeter'
import { ApiError } from '@/types/api'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [tenant, setTenant] = useState(searchParams.get('tenant') ?? '')
  const [showTenantField, setShowTenantField] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [succeeded, setSucceeded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allRequirementsMet = passwordScore(password, DEFAULT_PASSWORD_REQUIREMENTS) === DEFAULT_PASSWORD_REQUIREMENTS.length
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const canSubmit = allRequirementsMet && passwordsMatch

  const matchIcon = useMemo(() => {
    if (confirmPassword.length === 0) return { name: 'remove', className: 'text-secondary' }
    return passwordsMatch ? { name: 'check_circle', className: 'text-tertiary' } : { name: 'cancel', className: 'text-error' }
  }, [confirmPassword, passwordsMatch])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setIsSubmitting(true)
    setError(null)

    try {
      await authApi.resetPassword({ token, email, tenant, password, passwordConfirmation: confirmPassword })
      setSucceeded(true)
      setTimeout(() => navigate(ROUTES.login), 1800)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="flex w-full max-w-[1080px] items-stretch justify-center">
        <div className="grid w-full grid-cols-1 items-stretch gap-space-xl lg:grid-cols-12">
          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-inverse-surface p-space-xl text-inverse-on-surface shadow-xl lg:col-span-5">
            <div className="relative z-10 flex flex-col gap-space-lg">
              <div className="flex items-center gap-space-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-container text-on-primary-container shadow-sm">
                  <Icon name="shield_lock" size={24} />
                </div>
                <div className="flex flex-col">
                  <span className="text-label-sm uppercase tracking-wider text-secondary-fixed">Zero-Trust Credential Sync</span>
                  <span className="text-title-sm">SupportHub Identity Guardian</span>
                </div>
              </div>
              <div className="flex flex-col gap-space-xs">
                <span className="text-label-sm uppercase tracking-widest text-secondary-fixed">Active Account</span>
                <div className="flex items-center justify-between rounded-lg bg-on-background/40 p-space-md shadow-inner">
                  <div className="flex min-w-0 items-center gap-space-sm">
                    <Icon name="alternate_email" size={20} className="shrink-0 text-secondary-fixed-dim" />
                    <span className="truncate text-code-sm font-semibold text-surface">{email || 'your account'}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-space-sm rounded-lg bg-on-background/25 p-space-md">
                <div className="flex items-center justify-between text-secondary-fixed-dim">
                  <span className="flex items-center gap-space-xs text-label-sm">
                    <Icon name="fingerprint" size={16} className="text-tertiary-fixed" />
                    Session Integrity
                  </span>
                  <span className="text-code-sm font-bold text-tertiary-fixed">SHA-256 Validated</span>
                </div>
                <div className="flex items-start gap-space-sm rounded-lg bg-surface-container-low/10 p-space-md">
                  <Icon name="info" size={20} className="shrink-0 text-primary-fixed" />
                  <p className="text-body-sm leading-relaxed text-secondary-fixed">
                    Changing this credential immediately revokes active tokens across mobile, browser, and CLI sessions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl bg-surface-container-lowest p-space-xl shadow-sm lg:col-span-7 sm:p-gutter-lg">
            <div className="flex flex-col gap-space-lg">
              <div className="flex flex-col gap-space-xs">
                <div className="inline-flex items-center gap-space-xs text-label-sm font-bold uppercase tracking-wider text-primary">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary" />
                  Authentication Recovery
                </div>
                <h1 className="text-headline-lg font-bold tracking-tight">Create a new password</h1>
                <p className="max-w-xl text-body-md leading-relaxed text-on-surface-variant">
                  Your new password must be different from previous passwords and meet enterprise security standards.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-space-md rounded-lg bg-error-container p-space-md text-on-error-container">
                  <Icon name="error" size={20} className="mt-0.5 text-error" />
                  <div className="flex-1 text-body-sm">{error}</div>
                </div>
              )}

              {succeeded ? (
                <div className="flex items-center justify-between gap-space-sm rounded-lg bg-surface-container p-space-md text-tertiary shadow-sm">
                  <div className="flex items-center gap-space-sm">
                    <Icon name="verified_user" size={24} className="text-tertiary-container" />
                    <div>
                      <p className="text-title-sm text-on-surface">Credentials updated successfully!</p>
                      <p className="text-body-sm text-on-surface-variant">Redirecting to sign in…</p>
                    </div>
                  </div>
                </div>
              ) : (
                <form className="flex flex-col gap-space-lg" onSubmit={handleSubmit}>
                  <div className="flex flex-col gap-space-xs">
                    <PasswordField
                      label="New Password"
                      required
                      placeholder="Enter enterprise passphrase…"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      leadingIcon={<Icon name="key" size={20} />}
                      autoComplete="new-password"
                    />
                    <PasswordStrengthMeter value={password} />
                  </div>

                  <TextField
                    label="Confirm New Password"
                    required
                    type="password"
                    placeholder="Re-enter your new password…"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    leadingIcon={<Icon name="lock_reset" size={20} />}
                    trailingSlot={<Icon name={matchIcon.name} size={20} className={matchIcon.className} filled />}
                    autoComplete="new-password"
                  />

                  {showTenantField ? (
                    <TextField
                      label="Organization"
                      placeholder="acme-corp"
                      value={tenant}
                      onChange={(e) => setTenant(e.target.value)}
                      helperText="Only needed if your email is registered with more than one organization."
                      leadingIcon={<Icon name="domain" size={20} />}
                      autoComplete="organization"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowTenantField(true)}
                      className="self-start text-label-md font-semibold text-secondary hover:text-on-surface"
                    >
                      Resetting a password for a specific organization?
                    </button>
                  )}

                  <div className="flex flex-col items-center justify-between gap-space-md pt-space-xs sm:flex-row">
                    <Link
                      to={ROUTES.login}
                      className="order-2 flex w-full items-center justify-center gap-space-xs rounded px-space-md py-space-xs text-title-sm text-secondary transition-colors hover:text-on-surface sm:order-1 sm:w-auto"
                    >
                      <Icon name="arrow_back" size={18} />
                      Cancel and return to login
                    </Link>
                    <Button type="submit" className="order-1 w-full sm:order-2 sm:w-auto" size="lg" disabled={!canSubmit} isLoading={isSubmitting} leadingIcon="check_circle">
                      Update Password &amp; Sign In
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
