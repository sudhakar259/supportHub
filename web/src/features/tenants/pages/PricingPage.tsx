import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { FaqList } from '@/features/landing/components/FaqList'
import type { FaqItem } from '@/features/landing/components/FaqList'
import { useMembershipPlans } from '@/features/tenants/hooks/useMembershipPlans'
import type { MembershipPlan, MembershipPlanLimits } from '@/features/tenants/types'
import { cn } from '@/utils/cn'
import { formatPriceCents } from '@/utils/money'

/** The plan that is highlighted as the recommended choice. */
const POPULAR_SLUG = 'professional'

const LIMIT_ROWS: { key: keyof MembershipPlanLimits; label: string }[] = [
  { key: 'users', label: 'Team members' },
  { key: 'customers', label: 'Customers' },
  { key: 'ticketsPerMonth', label: 'Tickets per month' },
  { key: 'departments', label: 'Departments' },
  { key: 'apiRequestsPerDay', label: 'API requests per day' },
  { key: 'webhooks', label: 'Webhooks' },
]

const ALL_PLANS_INCLUDE = [
  'Ticket management with assignment, escalation and reopening',
  'Routing rules and SLA tracking',
  'Roles, permissions and an audit log',
  'Reports on volume, SLA compliance and agent performance',
  'Attachments up to 2 MB (images, PDF, Word, PowerPoint, text)',
  'Email notifications with editable templates',
  'API access and signed webhooks',
  'Each organization’s data kept separate from every other',
]

const FAQ: FaqItem[] = [
  {
    question: 'Do I need a credit card to start?',
    answer: 'No. You can create a workspace on the free Starter plan without payment details, and paid plans begin with a 14-day trial.',
  },
  {
    question: 'What happens when my trial ends?',
    answer: 'Choose a plan on the billing page to keep going. Until you do, access to the workspace is paused, but your data is kept.',
  },
  {
    question: 'Can I change plans later?',
    answer: 'Yes. You can move up or down from the billing page at any time.',
  },
  {
    question: 'What counts toward the limits?',
    answer: 'Team members are the staff accounts in your workspace, customers are the people who raise tickets, and tickets are counted per calendar month. API requests are counted per day for each API credential.',
  },
  {
    question: 'What happens if I reach a limit?',
    answer: 'Creating more of that item is blocked with a message naming the limit. Your existing data is not affected, and you can upgrade to continue.',
  },
  {
    question: 'How do I get Enterprise?',
    answer: 'Enterprise has no usage limits and custom pricing. Contact us and we will talk through what you need.',
  },
]

function limitText(value: number | null): string {
  return value === null ? 'Unlimited' : value.toLocaleString()
}

function isEnterprise(plan: MembershipPlan): boolean {
  return plan.slug === 'enterprise'
}

function priceLabel(plan: MembershipPlan): string {
  if (isEnterprise(plan)) return 'Custom'
  if (plan.priceCents === 0) return 'Free'
  return formatPriceCents(plan.priceCents, plan.currency)
}

function PlanCard({ plan }: { plan: MembershipPlan }) {
  const popular = plan.slug === POPULAR_SLUG
  const showInterval = !isEnterprise(plan) && plan.priceCents > 0

  return (
    <div
      className={cn(
        'relative flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm',
        popular && 'ring-2 ring-primary',
      )}
    >
      {popular && (
        <span className="absolute -top-3 left-space-lg rounded-full bg-primary px-space-md py-0.5 text-label-sm uppercase tracking-wider text-on-primary">
          Most popular
        </span>
      )}
      <div>
        <h3 className="text-headline-md text-on-surface">{plan.name}</h3>
        {plan.description && <p className="mt-1 text-body-sm text-on-surface-variant">{plan.description}</p>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-display-lg tracking-tight text-on-surface">{priceLabel(plan)}</span>
        {showInterval && <span className="text-label-sm text-on-surface-variant">/{plan.billingInterval === 'monthly' ? 'month' : 'year'}</span>}
      </div>
      <ul className="flex flex-1 flex-col gap-space-xs">
        {LIMIT_ROWS.map((row) => (
          <li key={row.key} className="flex items-center gap-space-xs text-body-sm text-on-surface">
            <Icon name="check_circle" size={18} filled className="shrink-0 text-tertiary" />
            <span>
              <strong>{limitText(plan.limits[row.key])}</strong> {row.label.toLowerCase()}
            </span>
          </li>
        ))}
      </ul>
      <Link
        to={isEnterprise(plan) ? ROUTES.contact : `${ROUTES.register}?plan=${plan.slug}`}
        className={cn(
          'inline-flex h-11 items-center justify-center rounded-lg text-title-sm font-semibold shadow-sm transition-colors',
          popular
            ? 'bg-primary text-on-primary hover:bg-primary-container'
            : 'bg-surface-container-low text-on-surface hover:bg-surface-container',
        )}
      >
        {isEnterprise(plan) ? 'Contact us' : plan.priceCents === 0 ? 'Start for free' : 'Start free trial'}
      </Link>
    </div>
  )
}

function ComparisonTable({ plans }: { plans: MembershipPlan[] }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl bg-surface-container-lowest shadow-sm">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <caption className="sr-only">Plan limits compared</caption>
        <thead>
          <tr className="bg-surface-container-low">
            <th scope="col" className="p-space-lg text-label-sm uppercase tracking-wider text-on-surface-variant">
              Limits
            </th>
            {plans.map((plan) => (
              <th key={plan.id} scope="col" className="p-space-lg text-title-md font-semibold text-on-surface">
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LIMIT_ROWS.map((row) => (
            <tr key={row.key} className="border-t border-outline-variant/30">
              <th scope="row" className="p-space-lg text-body-md font-medium text-on-surface">
                {row.label}
              </th>
              {plans.map((plan) => (
                <td key={plan.id} className="p-space-lg text-body-md text-on-surface-variant">
                  {limitText(plan.limits[row.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PricingPage() {
  const { plans, isLoading, error } = useMembershipPlans()

  return (
    <PublicLayout>
      <section className="bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-space-xl px-margin-mobile py-space-xl sm:px-margin lg:py-20">
          <div className="flex max-w-2xl flex-col items-center gap-space-sm text-center">
            <h1 className="text-display-lg tracking-tight text-on-surface">Plans that scale with your team</h1>
            <p className="text-body-lg text-on-surface-variant">
              Start free and upgrade as your support operation grows. Every plan includes the full feature set; the plans differ in how much you can use.
            </p>
          </div>

          {isLoading && <LoadingState label="Loading plans…" />}
          {error && <ErrorState description={error.message} />}

          {!isLoading && !error && plans.length > 0 && (
            <>
              <div className="grid w-full grid-cols-1 gap-gutter-lg pt-space-sm sm:grid-cols-2 lg:grid-cols-4">
                {plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
              <p className="text-body-sm text-on-surface-variant">Prices are per workspace, billed monthly in {plans[0].currency}.</p>
            </>
          )}
        </div>
      </section>

      {!isLoading && !error && plans.length > 0 && (
        <>
          <section className="bg-surface-container-low">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-space-lg px-margin-mobile py-space-xl sm:px-margin lg:py-16">
              <h2 className="text-headline-lg text-on-surface">Compare the limits</h2>
              <ComparisonTable plans={plans} />
            </div>
          </section>

          <section className="bg-surface">
            <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-space-lg px-margin-mobile py-space-xl sm:px-margin lg:py-16">
              <h2 className="text-headline-lg text-on-surface">Included in every plan</h2>
              <ul className="grid w-full gap-space-md sm:grid-cols-2">
                {ALL_PLANS_INCLUDE.map((item) => (
                  <li key={item} className="flex items-start gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
                    <Icon name="check_circle" size={20} filled className="mt-0.5 shrink-0 text-tertiary" />
                    <span className="text-body-md text-on-surface">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}

      <section className="bg-surface-container-low">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-space-xl px-margin-mobile py-space-xl sm:px-margin lg:py-16">
          <h2 className="text-headline-lg text-on-surface">Pricing questions</h2>
          <FaqList items={FAQ} />
        </div>
      </section>

      <section className="bg-primary text-on-primary">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-space-md px-margin-mobile py-space-xl text-center sm:px-margin lg:py-16">
          <h2 className="text-headline-lg">Not sure which plan fits?</h2>
          <p className="text-body-lg text-on-primary/90">Start on Starter and move up when you need to, or get in touch.</p>
          <div className="flex flex-wrap items-center justify-center gap-space-md">
            <Link
              to={ROUTES.register}
              className="inline-flex h-12 items-center rounded-lg bg-surface-container-lowest px-space-xl text-title-sm font-semibold text-primary shadow-sm transition-colors hover:bg-surface-container-high"
            >
              Start free trial
            </Link>
            <Link to={ROUTES.contact} className="inline-flex h-12 items-center px-space-lg text-title-sm font-semibold text-on-primary underline-offset-4 hover:underline">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
}
