import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { TextField } from '@/components/ui/TextField'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { authApi } from '@/features/auth/api/authApi'
import { ApiError } from '@/types/api'

const TIPS = [
  { icon: 'verified', title: 'Zero Knowledge', body: 'Passwords are cryptographically salted and never exposed to personnel.' },
  { icon: 'timelapse', title: 'Time Constrained', body: 'Reset requests expire in 15 minutes to prevent replay attacks.' },
  { icon: 'device_hub', title: 'Session Revoke', body: 'Resetting instantly invalidates all active mobile and desktop tokens.' },
]

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      await authApi.forgotPassword({ email })
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="flex w-full max-w-xl flex-col items-center justify-center">
        <AuthCard maxWidthClassName="w-full">
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-space-lg flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-container-low shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                  <Icon name="lock_reset" size={28} filled />
                </div>
              </div>
            </div>
            <h2 className="text-headline-lg tracking-tight">Reset your password</h2>
            <p className="mt-space-xs max-w-md text-body-md text-on-surface-variant">
              Enter your registered business email and we&rsquo;ll send a secure password reset link with instructions.
            </p>
          </div>

          {sent && (
            <div className="mt-space-lg rounded-lg bg-surface-container-low p-space-md">
              <div className="flex items-start gap-space-md">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tertiary-fixed text-tertiary">
                  <Icon name="mark_email_read" size={20} filled />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-title-sm">Reset link dispatched!</h4>
                    <span className="rounded bg-tertiary-fixed-dim/30 px-space-xs py-0.5 text-label-sm font-bold uppercase text-tertiary">
                      Sent
                    </span>
                  </div>
                  <p className="mt-space-xs text-body-sm leading-relaxed text-on-surface-variant">
                    If an account exists for <span className="font-semibold text-on-surface">{email}</span>, you&rsquo;ll receive an
                    email within 2 minutes. Please check your inbox and spam folder.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-space-lg flex items-start gap-space-md rounded-lg bg-error-container p-space-md text-on-error-container">
              <Icon name="error" size={20} className="mt-0.5 text-error" />
              <div className="flex-1 text-body-sm">{error}</div>
            </div>
          )}

          <form className="mt-space-lg space-y-space-md" onSubmit={handleSubmit}>
            <TextField
              label="Work Email Address"
              required
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leadingIcon={<Icon name="mail" size={20} />}
              helperText="Must correspond to your authorized Enterprise Workspace domain."
              autoComplete="email"
            />
            <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting} trailingIcon="arrow_forward">
              {sent ? 'Resend Instructions' : 'Send Reset Link'}
            </Button>
          </form>

          <div className="mt-space-xl flex flex-col items-center justify-between gap-space-md border-t border-surface-container-high/40 pt-space-lg text-center sm:flex-row sm:text-left">
            <Link
              to={ROUTES.login}
              className="inline-flex items-center gap-1.5 text-title-sm text-on-surface transition-colors hover:text-primary"
            >
              <Icon name="arrow_back" size={18} />
              <span>Return to Login</span>
            </Link>
            <div className="flex items-center gap-space-xs text-label-md text-secondary">
              <Icon name="verified_user" size={16} filled className="text-tertiary" />
              <span>TLS 1.3 256-Bit Cryptographic Link</span>
            </div>
          </div>
        </AuthCard>

        <div className="mt-space-xl grid w-full grid-cols-1 gap-space-md sm:grid-cols-3">
          {TIPS.map((tip) => (
            <div key={tip.title} className="flex flex-col gap-space-xs rounded-lg bg-surface-container-low p-space-md">
              <div className="flex items-center gap-space-xs text-title-sm text-primary">
                <Icon name={tip.icon} size={18} />
                <span>{tip.title}</span>
              </div>
              <p className="text-body-sm text-on-surface-variant">{tip.body}</p>
            </div>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}
