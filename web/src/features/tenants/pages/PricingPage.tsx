import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { Icon } from '@/components/ui/Icon'
import { useMembershipPlans } from '@/features/tenants/hooks/useMembershipPlans'
import type { MembershipPlan, MembershipPlanLimits } from '@/features/tenants/types'
import { formatPriceCents } from '@/utils/money'

function limitLines(limits: MembershipPlanLimits): string[] {
  const line = (value: number | null, unlimitedLabel: string, countLabel: (n: string) => string) =>
    value === null ? unlimitedLabel : countLabel(value.toLocaleString())

  return [
    line(limits.users, 'Unlimited users', (n) => `Up to ${n} users`),
    line(limits.customers, 'Unlimited customers', (n) => `Up to ${n} customers`),
    line(limits.ticketsPerMonth, 'Unlimited tickets/month', (n) => `${n} tickets/month`),
    line(limits.departments, 'Unlimited departments', (n) => `Up to ${n} department${limits.departments === 1 ? '' : 's'}`),
    line(limits.apiRequestsPerDay, 'Unlimited API requests/day', (n) => `${n} API requests/day`),
    line(limits.webhooks, 'Unlimited webhooks', (n) => `Up to ${n} webhook${limits.webhooks === 1 ? '' : 's'}`),
  ]
}

function PlanCard({ plan }: { plan: MembershipPlan }) {
  return (
    <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
      <div>
        <h3 className="text-headline-md text-on-surface">{plan.name}</h3>
        {plan.description && <p className="mt-1 text-body-sm text-on-surface-variant">{plan.description}</p>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-display-lg tracking-tight text-on-surface">{formatPriceCents(plan.priceCents, plan.currency)}</span>
        <span className="text-label-sm text-on-surface-variant">/{plan.billingInterval === 'monthly' ? 'month' : 'year'}</span>
      </div>
      <ul className="flex flex-1 flex-col gap-space-xs">
        {limitLines(plan.limits).map((line) => (
          <li key={line} className="flex items-center gap-space-xs text-body-sm text-on-surface">
            <Icon name="check_circle" size={18} filled className="text-tertiary" />
            {line}
          </li>
        ))}
      </ul>
      <Link
        to={`${ROUTES.register}?plan=${plan.slug}`}
        className="inline-flex h-11 items-center justify-center rounded-lg bg-primary text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
      >
        Get Started
      </Link>
    </div>
  )
}

export function PricingPage() {
  const { plans, isLoading, error } = useMembershipPlans()

  return (
    <AuthLayout>
      <div className="flex w-full max-w-6xl flex-col items-center gap-space-xl py-space-md">
        <div className="flex max-w-2xl flex-col items-center gap-space-sm text-center">
          <h1 className="text-display-lg tracking-tight text-on-surface">Plans that scale with your team</h1>
          <p className="text-body-lg text-on-surface-variant">
            Start free, upgrade as your support operation grows. No credit card required to get started.
          </p>
        </div>

        {isLoading && <LoadingState label="Loading plans…" />}
        {error && <ErrorState description={error.message} />}

        {!isLoading && !error && (
          <div className="grid w-full grid-cols-1 gap-gutter-lg sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
