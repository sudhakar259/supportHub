import type { FormEvent } from 'react'
import { useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { PasswordField } from '@/components/ui/PasswordField'
import { TextField } from '@/components/ui/TextField'
import { AuthCard } from '@/features/auth/components/AuthCard'
import {
  DEFAULT_PASSWORD_REQUIREMENTS,
  PasswordStrengthMeter,
  passwordScore,
} from '@/features/auth/components/PasswordStrengthMeter'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { tenantsApi } from '@/features/tenants/api/tenantsApi'
import { ApiError } from '@/types/api'
import { tokenStorage } from '@/services/storage/tokenStorage'
import { authApi } from '@/features/auth/api/authApi'
import { workspaceUrl, isWorkspaceSlug } from '@/features/workspaces/workspace'

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function RegistrationPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser } = useAuth()
  const plan = searchParams.get('plan') ?? undefined

  const [tenantName, setTenantName] = useState('')
  const [tenantSlug, setTenantSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [slugAvailability, setSlugAvailability] = useState<
    'unknown' | 'checking' | 'available' | 'taken' | 'unavailable'
  >('unknown')
  const slugCheckVersion = useRef(0)
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showMoreDetails, setShowMoreDetails] = useState(false)
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [country, setCountry] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const passwordValid = passwordScore(password, DEFAULT_PASSWORD_REQUIREMENTS) === DEFAULT_PASSWORD_REQUIREMENTS.length
  const passwordsMatch = passwordConfirmation.length > 0 && password === passwordConfirmation
  const canSubmit =
    tenantName &&
    tenantSlug &&
    isWorkspaceSlug(tenantSlug) &&
    ownerName &&
    ownerEmail &&
    passwordValid &&
    passwordsMatch &&
    agreedToTerms &&
    slugAvailability !== 'taken' &&
    slugAvailability !== 'checking'

  function invalidateSlugCheck() {
    slugCheckVersion.current += 1
    setSlugAvailability('unknown')
  }

  function handleTenantNameChange(value: string) {
    setTenantName(value)
    if (!slugEdited) {
      setTenantSlug(slugify(value))
      invalidateSlugCheck()
    }
  }

  async function checkSlugAvailability() {
    if (!tenantSlug) return
    const version = ++slugCheckVersion.current
    setSlugAvailability('checking')
    const result = await tenantsApi.lookupSlug(tenantSlug)
    if (version !== slugCheckVersion.current) return
    setSlugAvailability(result === null ? 'unavailable' : result.available ? 'available' : 'taken')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setFieldErrors({})
    setIsSubmitting(true)

    try {
      const { user, token } = await tenantsApi.register({
        tenantName,
        tenantSlug,
        ownerName,
        ownerEmail,
        ownerPassword: password,
        ownerPasswordConfirmation: passwordConfirmation,
        plan,
        phone: phone || undefined,
        website: website || undefined,
        country: country || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      tokenStorage.set(token)
      const destination = workspaceUrl(tenantSlug)
      if (destination && new URL(destination).origin !== window.location.origin) {
        try {
          const code = await authApi.createWorkspaceHandoff()
          await authApi.logout()
          tokenStorage.clear()
          window.location.assign(`${destination}#workspace-session=${encodeURIComponent(code)}`)
          return
        } catch {
          // Keep the created account usable if the cross-domain handoff is unavailable.
        }
      }
      setUser(user)
      navigate(ROUTES.emailVerification, { state: { fromRegistration: true } })
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        const mapped: Record<string, string> = {}
        for (const [field, messages] of Object.entries(err.errors)) mapped[field] = messages[0]
        setFieldErrors(mapped)
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to reach the server. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <div className="marketing-account-grid">
        <aside className="marketing-account-aside">
          <span className="marketing-eyebrow">A FRESH START FOR YOUR SUPPORT</span>
          <h2>
            Everything together.
            <br />
            Everyone on the same page.
          </h2>
          <p>Create a space for your team to organize requests, share context and take care of customers.</p>
          <ul>
            {[
              'Your own workspace, customers and ticket history',
              'Team departments, roles and routing rules',
              'SLA tracking, reports and connected integrations',
              'Free Starter plan. Paid plans start with a 14-day trial.',
            ].map((text) => (
              <li key={text}>
                <Icon name="check_circle" size={21} />
                {text}
              </li>
            ))}
          </ul>
          <Link to={ROUTES.demo} className="marketing-text-link">
            Explore the product first <Icon name="arrow_forward" size={18} />
          </Link>
        </aside>
        <AuthCard
          maxWidthClassName="w-full"
          accentClassName="bg-primary"
          className="border border-outline-variant/60 shadow-sm"
        >
          <h1 className="mb-space-xs text-headline-lg tracking-tight">Create your workspace</h1>
          <p className="mb-space-lg text-body-md text-on-surface-variant">
            Set up your support workspace in minutes. No credit card required.
            {plan && (
              <>
                {' '}
                Selected plan: <span className="font-semibold text-on-surface">{plan}</span>.{' '}
                <Link to={ROUTES.pricing} className="text-primary hover:underline">
                  Change plan
                </Link>
              </>
            )}
          </p>

          {error && (
            <div className="mb-space-lg flex items-start gap-space-md rounded-lg bg-error-container p-space-md text-on-error-container">
              <Icon name="error" size={20} className="mt-0.5 text-error" />
              <div className="flex-1 text-body-sm">{error}</div>
            </div>
          )}

          <form className="flex flex-col gap-space-md" onSubmit={handleSubmit}>
            <div className="marketing-registration-fields">
              <TextField
                label="Organization Name"
                required
                placeholder="Help Corp"
                value={tenantName}
                onChange={(e) => handleTenantNameChange(e.target.value)}
                error={fieldErrors.tenant_name}
              />
              <TextField
                label="Workspace ID"
                required
                placeholder="help-corp"
                value={tenantSlug}
                onChange={(e) => {
                  setTenantSlug(slugify(e.target.value))
                  setSlugEdited(true)
                  invalidateSlugCheck()
                }}
                onBlur={() => void checkSlugAvailability()}
                error={fieldErrors.tenant_slug || (tenantSlug && !isWorkspaceSlug(tenantSlug) ? 'Choose a valid workspace ID. Reserved names such as api and www are unavailable.' : undefined)}
                leadingIcon={<Icon name="link" size={18} />}
                trailingSlot={
                  slugAvailability === 'checking' ? (
                    <Icon name="progress_activity" size={18} className="animate-spin text-secondary" />
                  ) : slugAvailability === 'available' ? (
                    <Icon name="check_circle" size={18} filled className="text-tertiary" />
                  ) : slugAvailability === 'taken' ? (
                    <Icon name="cancel" size={18} filled className="text-error" />
                  ) : undefined
                }
                helperText={
                  slugAvailability === 'taken'
                    ? undefined
                    : workspaceUrl(tenantSlug || 'your-workspace', '')
                      ? `Your workspace: ${workspaceUrl(tenantSlug || 'your-workspace', '')}`
                      : `Your sign-in workspace ID: ${tenantSlug || 'your-workspace'}.`
                }
              />
              {slugAvailability === 'taken' && (
                <p className="marketing-registration-notice -mt-space-sm text-body-sm text-error">This slug is already taken.</p>
              )}
              {slugAvailability === 'unavailable' && (
                <p className="marketing-registration-notice -mt-space-sm text-body-sm text-on-surface-variant" role="status">
                  We couldn’t check this ID right now. We’ll validate it when you create your workspace.
                </p>
              )}

              <TextField
                label="Full Name"
                required
                placeholder="Jamie Rivera"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                error={fieldErrors.owner_name}
                autoComplete="name"
              />
              <TextField
                label="Work Email"
                required
                type="email"
                placeholder="jamie@example.com"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                error={fieldErrors.owner_email}
                autoComplete="email"
              />

              <PasswordField
                label="Password"
                required
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.owner_password}
                autoComplete="new-password"
              />
              <PasswordField
                label="Confirm Password"
                required
                placeholder="Re-enter your password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                error={
                  passwordConfirmation.length > 0 && !passwordsMatch
                    ? 'Passwords do not match.'
                    : fieldErrors.owner_password_confirmation
                }
                autoComplete="new-password"
              />
            </div>
            <PasswordStrengthMeter value={password} />

            {showMoreDetails ? (
              <div className="flex flex-col gap-space-md rounded-lg bg-surface-container-low p-space-md">
                <TextField
                  label="Phone (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  error={fieldErrors.phone}
                />
                <TextField
                  label="Website (optional)"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  error={fieldErrors.website}
                />
                <TextField
                  label="Country (optional)"
                  placeholder="US"
                  maxLength={2}
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase())}
                  error={fieldErrors.country}
                  helperText="2-letter ISO country code."
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowMoreDetails(true)}
                className="self-start text-label-md font-semibold text-secondary hover:text-on-surface"
              >
                + Add phone, website, or country
              </button>
            )}

            <div className="flex items-start gap-space-sm text-body-sm text-on-surface-variant">
              <input
                type="checkbox"
                id="registration-terms"
                aria-label="I agree to the Terms of Service and Privacy Policy"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-primary"
              />
              <span id="registration-terms-label">
                <label htmlFor="registration-terms">I agree to the </label>
                <Link to={ROUTES.terms} className="text-primary underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to={ROUTES.privacy} className="text-primary underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </div>

            <Button type="submit" size="lg" isLoading={isSubmitting} disabled={!canSubmit} trailingIcon="arrow_forward">
              Create workspace
            </Button>
          </form>

          <p className="mt-space-lg text-center text-body-sm text-on-surface-variant">
            Already have an organization?{' '}
            <Link to={ROUTES.login} className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </AuthCard>
      </div>
    </AuthLayout>
  )
}
