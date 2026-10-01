import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { InlineAlert } from '@/components/feedback/InlineAlert'
import { AuthCard } from '@/features/auth/components/AuthCard'

const REMEDIATION_STEPS = [
  {
    title: 'Self-Service Unlock Link',
    tag: 'Fastest',
    description: 'A one-time security dispatch was sent to your registered corporate email. Valid for 15 minutes.',
  },
  {
    title: 'Enterprise IT Security Desk',
    description: 'Request a bypass token or temporary exception from your designated IT Administrator.',
  },
]

/**
 * Reached when login returns the "account deactivated" response (403) from
 * AuthController::login, or from a client-side failed-attempt counter.
 */
export function AccountLockedPage() {
  const [isResending, setIsResending] = useState(false)
  const [resent, setResent] = useState(false)

  function handleResend() {
    setIsResending(true)
    setTimeout(() => {
      setIsResending(false)
      setResent(true)
    }, 900)
  }

  return (
    <AuthLayout>
      <AuthCard maxWidthClassName="w-full max-w-4xl" accentClassName="bg-gradient-to-r from-error via-primary to-primary-container">
        <div className="flex flex-col gap-space-md pb-space-lg sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-space-sm">
            <Badge tone="danger" dot>
              Policy SEC-403 Enforcement
            </Badge>
          </div>
          <div className="flex items-center gap-space-xs rounded bg-surface-container-low px-space-sm py-1 text-label-sm text-on-surface-variant">
            <Icon name="verified_user" size={16} className="text-tertiary" />
            <span>Zero-Trust Guardrail Active</span>
          </div>
        </div>

        <div className="flex flex-col items-start gap-space-xl pt-space-sm md:flex-row">
          <div className="flex shrink-0 items-center gap-space-md md:flex-col">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-surface-container shadow-inner sm:h-24 sm:w-24">
              <Icon name="gpp_maybe" size={48} className="text-error" filled />
              <div className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-container text-on-primary-container shadow-md">
                <Icon name="lock" size={16} />
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-headline-lg font-bold tracking-tight">Account Temporarily Locked</h1>
            <p className="mt-space-xs text-body-lg text-on-surface-variant">
              To protect your organization&rsquo;s sensitive data, access has been restricted due to{' '}
              <strong className="font-semibold text-on-surface">repeated failed sign-in attempts</strong>.
            </p>

            <div className="mt-space-xl flex flex-col gap-space-md">
              <div className="flex items-center gap-space-xs text-title-md">
                <Icon name="tune" size={20} className="text-primary" />
                Authorized Remediation Protocols
              </div>

              {REMEDIATION_STEPS.map((step, index) => (
                <div
                  key={step.title}
                  className="flex flex-col items-start justify-between gap-space-md rounded-xl bg-surface-container-lowest p-space-md shadow-sm sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-start gap-space-md">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container text-title-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex flex-wrap items-center gap-space-xs">
                        <span className="text-title-sm text-on-surface">{step.title}</span>
                        {step.tag && (
                          <span className="py-0.2 rounded bg-tertiary-fixed px-space-xs text-label-sm uppercase text-on-tertiary-fixed-variant">
                            {step.tag}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-body-sm text-on-surface-variant">{step.description}</p>
                    </div>
                  </div>
                  {index === 0 && (
                    <Button variant="ghost" size="sm" leadingIcon="mark_email_read" isLoading={isResending} onClick={handleResend}>
                      Resend Email
                    </Button>
                  )}
                </div>
              ))}

              {resent && <InlineAlert tone="success" title="Remediation link dispatched to your registered mailbox." />}
            </div>

            <div className="mt-space-xl flex flex-col items-stretch justify-between gap-space-md pt-space-lg sm:flex-row sm:items-center">
              <div className="flex items-center gap-space-xs text-body-sm text-on-surface-variant">
                <Icon name="info" size={18} className="text-secondary" />
                <span>Was this not you? Report an account takeover attempt immediately.</span>
              </div>
              <div className="flex items-center gap-space-sm">
                <Link
                  to={ROUTES.login}
                  className="flex-1 rounded px-space-md py-space-xs text-center text-title-sm text-secondary transition-colors hover:bg-surface-container-low hover:text-on-surface sm:flex-none"
                >
                  Back to Login
                </Link>
                <Button leadingIcon="support_agent">Contact Security Desk</Button>
              </div>
            </div>
          </div>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}
