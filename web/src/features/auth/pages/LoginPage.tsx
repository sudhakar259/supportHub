import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { BrandMark } from '@/components/ui/BrandMark'
import { PasswordField } from '@/components/ui/PasswordField'
import { TextField } from '@/components/ui/TextField'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ApiError } from '@/types/api'
import { isPlatformAdmin } from '@/types/user'
import { publicSiteUrl, workspaceDomain, workspaceSlug } from '@/features/workspaces/workspace'
import { WorkspaceFinder } from '@/features/workspaces/WorkspaceFinder'
import { WorkspaceSessionLanding } from '@/features/workspaces/WorkspaceSessionLanding'

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const slug = workspaceSlug()
  const code = new URLSearchParams(location.hash.slice(1)).get('workspace-session')
  if (slug && code) return <WorkspaceSessionLanding code={code} />
  if (workspaceDomain() && !slug && searchParams.get('platform') !== '1') return <WorkspaceFinder />
  return <WorkspaceLoginPage />
}

function WorkspaceLoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const activeWorkspace = workspaceSlug()
  const [tenant, setTenant] = useState(activeWorkspace ?? '')
  const [showTenantField, setShowTenantField] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setIsSubmitting(true)

    try {
      const result = await login({ email, password, tenant })
      if (result.status === 'two_factor') {
        navigate(ROUTES.twoFactor, { state: { challengeToken: result.challengeToken } })
        return
      }
      const user = result.user
      navigate(
        !user.emailVerifiedAt
          ? ROUTES.emailVerification
          : isPlatformAdmin(user)
            ? ROUTES.platformDashboard
            : ROUTES.dashboard,
      )
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) {
          setFieldErrors({
            email: err.fieldError('email') ?? '',
            password: err.fieldError('password') ?? '',
            tenant: err.fieldError('tenant') ?? '',
          })
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
          <AuthCard
            maxWidthClassName="lg:col-span-7 w-full"
            accentClassName="bg-primary"
            className="border border-outline-variant/60 shadow-sm"
          >
            <div className="mb-space-md flex items-center gap-space-sm">
              <div className="flex h-10 w-10 items-center justify-center">
                <BrandMark size={40} variant="icon" />
              </div>
              <div>
                <span className="text-label-sm font-bold uppercase tracking-widest text-primary">Secure Access</span>
                <div className="text-code-sm text-secondary">Your team’s support workspace</div>
              </div>
            </div>
            <h1 className="mb-space-xs text-headline-lg tracking-tight">{activeWorkspace ? `Sign in to ${activeWorkspace}` : 'Welcome back to DeskZeal'}</h1>
            <p className="mb-space-lg text-body-md text-on-surface-variant">
              Sign in to manage your tickets, customers and team in one place.
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
                  <Link
                    to={ROUTES.forgotPassword}
                    className="text-label-md font-semibold text-primary hover:text-primary-container"
                  >
                    Forgot password?
                  </Link>
                }
              />
              {activeWorkspace ? (
                <p className="rounded-lg bg-surface-container-low p-space-md text-body-sm">Workspace: <strong>{window.location.host}</strong></p>
              ) : showTenantField ? (
                <TextField
                  label="Organization"
                  placeholder="help-corp"
                  value={tenant}
                  onChange={(e) => setTenant(e.target.value)}
                  error={fieldErrors.tenant || undefined}
                  helperText="Only needed if your email is registered with more than one organization."
                  leadingIcon={<Icon name="domain" size={20} />}
                  autoComplete="organization"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowTenantField(true)}
                  className="text-label-md font-semibold text-secondary hover:text-on-surface"
                >
                  Signing in to a specific organization?
                </button>
              )}
              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  isLoading={isSubmitting}
                  trailingIcon="arrow_forward"
                >
                  Sign in to Workspace
                </Button>
              </div>
              <p className="pt-2 text-center text-body-sm text-on-surface-variant">
                Don&rsquo;t have an organization yet?{' '}
                <Link to={publicSiteUrl(ROUTES.register)} className="font-semibold text-primary hover:underline">
                  Register
                </Link>
              </p>
            </form>
          </AuthCard>

          <aside className="marketing-account-aside lg:col-span-5">
            <span className="marketing-eyebrow">PICK UP WHERE YOU LEFT OFF</span>
            <h2>
              One workspace.
              <br />A clearer day ahead.
            </h2>
            <p>Your next conversation, the context behind it and the teammates who can help — all together.</p>
            <ul>
              {[
                { icon: 'inbox', text: 'Stay on top of your team’s ticket queue.' },
                { icon: 'timer', text: 'Keep response and resolution targets in view.' },
                { icon: 'groups', text: 'Share context with replies and private notes.' },
              ].map((item) => (
                <li key={item.icon}>
                  <Icon name={item.icon} size={23} />
                  {item.text}
                </li>
              ))}
            </ul>
            <Link to={publicSiteUrl(ROUTES.demo)} className="marketing-text-link">
              Take another look around <Icon name="arrow_forward" size={18} />
            </Link>
          </aside>
        </div>
      </div>
    </AuthLayout>
  )
}
