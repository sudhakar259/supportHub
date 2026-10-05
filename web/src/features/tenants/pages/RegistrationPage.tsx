import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { PasswordField } from '@/components/ui/PasswordField'
import { TextField } from '@/components/ui/TextField'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { DEFAULT_PASSWORD_REQUIREMENTS, PasswordStrengthMeter, passwordScore } from '@/features/auth/components/PasswordStrengthMeter'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { tenantsApi } from '@/features/tenants/api/tenantsApi'
import { ApiError } from '@/types/api'
import { tokenStorage } from '@/services/storage/tokenStorage'

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
  const [slugAvailability, setSlugAvailability] = useState<'unknown' | 'checking' | 'available' | 'taken'>('unknown')
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
  const canSubmit = tenantName && tenantSlug && ownerName && ownerEmail && passwordValid && passwordsMatch && agreedToTerms

  function handleTenantNameChange(value: string) {
    setTenantName(value)
    if (!slugEdited) setTenantSlug(slugify(value))
  }

  async function checkSlugAvailability() {
    if (!tenantSlug) return
    setSlugAvailability('checking')
    const result = await tenantsApi.lookupSlug(tenantSlug)
    setSlugAvailability(result === null ? 'available' : result.available ? 'available' : 'taken')
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
      })
      tokenStorage.set(token)
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
      <div className="flex w-full max-w-2xl flex-col items-center py-space-md">
        <AuthCard maxWidthClassName="w-full" accentClassName="bg-gradient-to-r from-primary via-primary-container to-secondary">
          <h1 className="mb-space-xs text-headline-lg tracking-tight">Create your organization</h1>
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
            <TextField
              label="Organization Name"
              required
              placeholder="Acme Corp"
              value={tenantName}
              onChange={(e) => handleTenantNameChange(e.target.value)}
              error={fieldErrors.tenant_name}
            />
            <TextField
              label="Organization Slug"
              required
              placeholder="acme-corp"
              value={tenantSlug}
              onChange={(e) => {
                setTenantSlug(slugify(e.target.value))
                setSlugEdited(true)
                setSlugAvailability('unknown')
              }}
              onBlur={() => void checkSlugAvailability()}
              error={fieldErrors.tenant_slug}
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
                  : `Your workspace: ${tenantSlug || 'your-slug'}.supporthub.io — used to sign in if your email exists under more than one organization.`
              }
            />
            {slugAvailability === 'taken' && <p className="-mt-space-sm text-body-sm text-error">This slug is already taken.</p>}

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
              placeholder="jamie@acme.com"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              error={fieldErrors.owner_email}
              autoComplete="email"
            />

            <div className="flex flex-col gap-space-xs">
              <PasswordField
                label="Password"
                required
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldErrors.owner_password}
                autoComplete="new-password"
              />
              <PasswordStrengthMeter value={password} />
            </div>
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

            {showMoreDetails ? (
              <div className="flex flex-col gap-space-md rounded-lg bg-surface-container-low p-space-md">
                <TextField label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} error={fieldErrors.phone} />
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

            <label className="flex items-start gap-space-sm text-body-sm text-on-surface-variant">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded accent-primary"
              />
              I agree to the Terms of Service and Privacy Policy.
            </label>

            <Button type="submit" size="lg" isLoading={isSubmitting} disabled={!canSubmit} trailingIcon="arrow_forward">
              Create Organization &amp; Continue
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
