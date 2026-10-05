import { Link, Navigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { isPlatformAdmin } from '@/types/user'

const CAPABILITIES = [
  {
    icon: 'confirmation_number',
    title: 'Tickets and routing',
    description: 'Create, assign, reply to and resolve tickets. Routing rules send new tickets to the right department or agent.',
  },
  {
    icon: 'apartment',
    title: 'Departments and teams',
    description: 'Organize agents into departments, with roles and permissions scoped to your organization.',
  },
  {
    icon: 'webhook',
    title: 'Integrations',
    description: 'Issue API credentials for your systems and subscribe webhooks to ticket events.',
  },
]

export function LandingPage() {
  const { user } = useAuth()

  if (user) {
    return <Navigate to={isPlatformAdmin(user) ? ROUTES.platformDashboard : ROUTES.dashboard} replace />
  }

  return (
    <AuthLayout>
      <div className="flex w-full max-w-4xl flex-col items-center gap-space-xl text-center">
        <div className="flex flex-col gap-space-md">
          <h1 className="text-display-lg tracking-tight">Support desk for every organization, kept separate</h1>
          <p className="mx-auto max-w-2xl text-body-lg text-on-surface-variant">
            SupportHub gives each organization its own tickets, customers, departments and integrations, with access
            limited to that organization.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-space-md">
          <Link
            to={ROUTES.register}
            className="inline-flex h-11 items-center rounded-lg bg-primary px-space-lg text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
          >
            Start free trial
          </Link>
          <Link
            to={ROUTES.pricing}
            className="inline-flex h-11 items-center rounded-lg bg-surface-container-low px-space-lg text-title-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
          >
            View plans
          </Link>
          <Link
            to={ROUTES.login}
            className="inline-flex h-11 items-center px-space-lg text-title-sm font-semibold text-on-surface-variant transition-colors hover:text-on-surface"
          >
            Sign in
          </Link>
        </div>

        <div className="grid w-full grid-cols-1 gap-space-md md:grid-cols-3">
          {CAPABILITIES.map((capability) => (
            <div key={capability.title} className="flex flex-col items-start gap-space-sm rounded-xl bg-surface-container-lowest p-space-lg text-left shadow-sm">
              <Icon name={capability.icon} size={24} className="text-primary" />
              <h2 className="text-title-md font-semibold">{capability.title}</h2>
              <p className="text-body-sm text-on-surface-variant">{capability.description}</p>
            </div>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}
