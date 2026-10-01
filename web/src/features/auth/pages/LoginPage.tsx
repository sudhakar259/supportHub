import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Icon } from '@/components/ui/Icon'
import { PasswordField } from '@/components/ui/PasswordField'
import { TextField } from '@/components/ui/TextField'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ApiError } from '@/types/api'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setIsSubmitting(true)

    try {
      const user = await login({ email, password })
      navigate(user.emailVerifiedAt ? ROUTES.dashboard : ROUTES.emailVerification)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) {
          setFieldErrors({ email: err.fieldError('email') ?? '', password: err.fieldError('password') ?? '' })
        } else {
          setError(err.message)
        }
      } else {
        setError('Unable to reach the server. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="flex w-full max-w-6xl flex-col items-center justify-center py-space-md">
        <div className="grid w-full grid-cols-1 items-stretch gap-gutter-lg lg:grid-cols-12">
          <AuthCard maxWidthClassName="lg:col-span-7 w-full" accentClassName="bg-gradient-to-r from-primary via-primary-container to-secondary">
            <div className="mb-space-md flex items-center gap-space-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-inverse-surface shadow-md">
                <Icon name="support_agent" size={24} className="text-inverse-on-surface" />
              </div>
              <div>
                <span className="text-label-sm font-bold uppercase tracking-widest text-primary">Secure Access</span>
                <div className="text-code-sm text-secondary">SupportHub Enterprise Workspace</div>
              </div>
            </div>
            <h1 className="mb-space-xs text-headline-lg tracking-tight">Welcome back to SupportHub</h1>
            <p className="mb-space-lg text-body-md text-on-surface-variant">
              Sign in to access your helpdesk workspace, SLA queues, and live incident rooms.
            </p>

            {error && (
              <div className="mb-space-lg flex items-start gap-space-md rounded-lg bg-error-container p-space-md text-on-error-container shadow-sm">
                <Icon name="error" size={20} className="mt-0.5 text-error" />
                <div className="flex-1">
                  <div className="text-title-sm font-semibold">Authentication failed</div>
                  <div className="mt-0.5 text-body-sm opacity-90">{error}</div>
                </div>
              </div>
            )}

            <form className="space-y-space-md" onSubmit={handleSubmit}>
              <TextField
                label="Work Email Address"
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email || undefined}
                leadingIcon={<Icon name="mail" size={20} />}
                autoComplete="email"
              />
              <PasswordField
                label="Password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.password || undefined}
                autoComplete="current-password"
                labelAside={
                  <Link to={ROUTES.forgotPassword} className="text-label-md font-semibold text-primary hover:text-primary-container">
                    Forgot password?
                  </Link>
                }
              />
              <div className="flex items-center justify-between pt-1">
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  label="Remember this browser for 30 days"
                />
              </div>
              <div className="pt-2">
                <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting} trailingIcon="arrow_forward">
                  Sign in to Workspace
                </Button>
              </div>
            </form>
          </AuthCard>

          <div className="flex flex-col justify-between gap-space-md lg:col-span-5">
            <div className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-xl bg-inverse-surface p-space-lg text-inverse-on-surface shadow-xl sm:p-space-xl">
              <div>
                <div className="mb-space-lg flex items-center justify-between">
                  <span className="rounded bg-surface-container-highest/10 px-space-sm py-1 text-code-sm uppercase tracking-wider text-primary-fixed">
                    Real-Time SLA Engine
                  </span>
                </div>
                <div className="mb-space-xs text-headline-md font-bold">Incident Command Ready</div>
                <p className="mb-space-lg text-body-md text-inverse-on-surface/80">
                  Your support workspace routes mission-critical alerts with sub-second latency.
                </p>
              </div>
              <div className="flex items-center gap-space-md border-t border-inverse-on-surface/10 pt-space-md">
                <div className="flex -space-x-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-xs font-bold text-on-primary-container ring-2 ring-inverse-surface">
                    EM
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-bold text-on-secondary ring-2 ring-inverse-surface">
                    SR
                  </div>
                </div>
                <span className="text-body-sm text-inverse-on-surface/70">Joined by 320+ engineers across 4 global regions</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-md">
              <div className="flex items-center gap-space-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-low text-primary">
                  <Icon name="vpn_key" size={24} />
                </div>
                <div>
                  <div className="text-title-sm font-semibold">Hardware Key Supported</div>
                  <div className="text-body-sm text-secondary">FIDO2, WebAuthn &amp; YubiKey 5 Series</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  )
}
