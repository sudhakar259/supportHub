import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Icon } from '@/components/ui/Icon'
import { PasswordField } from '@/components/ui/PasswordField'
import { authApi } from '@/features/auth/api/authApi'
import type { PasswordRequirement } from '@/features/auth/components/PasswordStrengthMeter'
import { DEFAULT_PASSWORD_REQUIREMENTS, PasswordStrengthMeter, passwordScore } from '@/features/auth/components/PasswordStrengthMeter'
import { ApiError } from '@/types/api'

export function SetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''
  const name = searchParams.get('name') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requirements: PasswordRequirement[] = useMemo(() => {
    const identityTerms = [name, email.split('@')[0]].filter(Boolean).map((s) => s.toLowerCase())
    return [
      ...DEFAULT_PASSWORD_REQUIREMENTS,
      {
        id: 'identity',
        label: 'Does not contain your name or email',
        test: (value) => value.length > 0 && !identityTerms.some((term) => term && value.toLowerCase().includes(term)),
      },
    ]
  }, [name, email])

  const allRequirementsMet = passwordScore(password, requirements) === requirements.length
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const canSubmit = allRequirementsMet && passwordsMatch && agreedToTerms

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setIsSubmitting(true)
    setError(null)
    try {
      await authApi.resetPassword({ token, email, password, passwordConfirmation: confirmPassword })
      navigate(ROUTES.login)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-5xl py-space-md">
        <div className="grid grid-cols-1 items-start gap-space-lg lg:grid-cols-12">
          <div className="flex flex-col gap-space-lg lg:col-span-5">
            <div className="relative overflow-hidden rounded-xl bg-inverse-surface p-space-xl text-inverse-on-surface shadow-xl">
              <div className="relative z-10 flex flex-col gap-space-md">
                <div className="inline-flex items-center gap-space-xs self-start rounded bg-surface-container-high/10 px-space-sm py-space-xs text-label-sm uppercase tracking-wider text-primary-fixed">
                  <Icon name="verified_user" size={14} />
                  <span>Workspace Invitation</span>
                </div>
                <div className="flex items-center gap-space-md pt-space-xs">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary shadow-md">
                    <Icon name="lock_reset" size={28} className="text-on-primary" />
                  </div>
                  <div>
                    <p className="text-headline-sm leading-none tracking-tight text-surface">Security Provisioning</p>
                    <p className="mt-1 text-label-sm text-secondary-fixed-dim">DeskZeal Enterprise Desk</p>
                  </div>
                </div>
                <p className="pt-space-xs leading-relaxed text-body-md text-surface-dim">
                  Complete credential initialization to access real-time incident queues and SLA telemetry.
                </p>
              </div>
              {(name || email) && (
                <div className="relative z-10 mt-space-xl flex flex-col gap-space-sm rounded-lg bg-surface-container-high/10 p-space-md">
                  <span className="text-label-sm uppercase tracking-wider text-secondary-fixed">Target Profile</span>
                  <div className="flex flex-col">
                    {name && <span className="truncate text-title-sm text-surface">{name}</span>}
                    {email && <span className="truncate text-body-sm text-secondary-fixed-dim">{email}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-space-lg lg:col-span-7">
            <div className="flex flex-col gap-space-lg rounded-xl bg-surface-container-lowest p-space-xl shadow-sm">
              <div className="flex flex-col gap-space-xs">
                <div className="flex items-center gap-space-xs text-label-md uppercase tracking-wider text-primary">
                  <Icon name="key" size={16} />
                  <span>Identity Provisioning</span>
                </div>
                <h1 className="text-headline-lg tracking-tight">Set up your DeskZeal password</h1>
                <p className="text-body-md text-on-surface-variant">
                  Create your credentials to begin using the enterprise workspace.
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-space-md rounded-lg bg-error-container p-space-md text-on-error-container">
                  <Icon name="error" size={20} className="mt-0.5 text-error" />
                  <div className="flex-1 text-body-sm">{error}</div>
                </div>
              )}

              <form className="flex flex-col gap-space-lg" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-space-xs">
                  <PasswordField
                    label="Create Password"
                    placeholder="Enter a resilient passphrase"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leadingIcon={<Icon name="password" size={20} />}
                    autoComplete="new-password"
                  />
                  <PasswordStrengthMeter value={password} requirements={requirements} />
                </div>

                <PasswordField
                  label="Confirm Password"
                  placeholder="Re-enter your passphrase"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  leadingIcon={<Icon name="lock" size={20} />}
                  helperText={confirmPassword.length > 0 && !passwordsMatch ? 'Passphrases do not match yet.' : undefined}
                  autoComplete="new-password"
                />

                <Checkbox
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  description={
                    <span className="leading-relaxed">
                      I agree to DeskZeal&rsquo;s Acceptable Use Policy and Enterprise Security Guidelines, including mandatory
                      multi-factor authentication enrollment.
                    </span>
                  }
                />

                <Button type="submit" size="lg" disabled={!canSubmit} isLoading={isSubmitting} trailingIcon="arrow_forward">
                  Complete Setup &amp; Access Workspace
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
