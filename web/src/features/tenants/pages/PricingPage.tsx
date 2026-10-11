import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { FaqList } from '@/features/landing/components/FaqList'
import { PublicCta } from '@/features/landing/components/PublicCta'
import { useMembershipPlans } from '@/features/tenants/hooks/useMembershipPlans'
import type { BillingInterval, MembershipPlan, MembershipPlanLimits } from '@/features/tenants/types'
import { formatPriceCents } from '@/utils/money'

const LIMIT_ROWS: { key: keyof MembershipPlanLimits; label: string }[] = [
  { key: 'users', label: 'Team members' },
  { key: 'customers', label: 'Customers' },
  { key: 'ticketsPerMonth', label: 'Tickets per month' },
  { key: 'departments', label: 'Departments' },
  { key: 'apiRequestsPerDay', label: 'API requests per day' },
  { key: 'webhooks', label: 'Webhooks' },
]

const ALL_PLANS_INCLUDE = [
  'Ticket assignment, escalation, resolution and reopening',
  'Routing rules and SLA tracking',
  'Departments, roles and permissions',
  'Ticket volume, SLA and agent performance reports',
  'Public replies, private notes and attachments',
  'Inbound email with Mailgun configuration',
  'Email notifications with editable templates',
  'API access and signed webhooks',
  'Organization-scoped data and settings',
  'An audit history of important changes',
]

const FAQ = [
  {
    question: 'Do I need a credit card to start?',
    answer: 'No. The free Starter plan needs no payment details, and paid plans begin with a 14-day trial.',
  },
  {
    question: 'What happens when my trial ends?',
    answer:
      'Choose and pay for a plan from the billing page to continue. When the trial expires without an active paid subscription, workspace access is paused and your data is kept.',
  },
  {
    question: 'Can I change plans later?',
    answer:
      'Yes. You can manage your plan from the billing page. If you move to a smaller plan, its usage limits apply.',
  },
  {
    question: 'What counts toward the limits?',
    answer:
      'Team members are staff accounts. Customers are the people your team supports. Tickets are counted by calendar month. The daily integration API request allowance applies to each API credential.',
  },
  {
    question: 'What happens if I reach a limit?',
    answer:
      'Creating more of that item is blocked with a message naming the limit. Existing data stays in your workspace. You can upgrade to increase the allowance.',
  },
  {
    question: 'How do I get Enterprise?',
    answer:
      'Enterprise uses custom pricing. Contact us with your team size, ticket volume and integration requirements to discuss the right setup.',
  },
]

function limitText(value: number | null) {
  return value === null ? 'Unlimited' : value.toLocaleString()
}

function PlanCard({ plan }: { plan: MembershipPlan }) {
  const recommended = plan.slug === 'professional'
  const enterprise = plan.slug === 'enterprise'
  const price = enterprise
    ? 'Custom'
    : plan.priceCents === 0
      ? 'Free'
      : formatPriceCents(plan.priceCents, plan.currency)
  return (
    <div className={`marketing-plan${recommended ? ' marketing-plan-recommended' : ''}`}>
      {recommended && <span className="marketing-plan-badge">FOR GROWING TEAMS</span>}
      <div>
        <h3>{plan.name}</h3>
        <p>{plan.description || 'A workspace for your support team.'}</p>
      </div>
      <div className="marketing-plan-price">
        <strong>{price}</strong>
        {!enterprise && plan.priceCents > 0 && (
          <span>
            /{plan.billingInterval === 'monthly' ? 'month' : 'year'}
            <br />
            per workspace · {plan.currency}
          </span>
        )}
      </div>
      <ul>
        {LIMIT_ROWS.map((row) => (
          <li key={row.key}>
            <Icon name="check" size={17} />
            <span>
              <strong>{limitText(plan.limits[row.key])}</strong> {row.label.toLowerCase()}
            </span>
          </li>
        ))}
      </ul>
      <Link
        to={enterprise ? ROUTES.contact : `${ROUTES.register}?plan=${encodeURIComponent(plan.slug)}`}
        className={`marketing-button${recommended ? '' : ' marketing-button-outline'}`}
      >
        {enterprise ? 'Contact us' : plan.priceCents === 0 ? 'Start for free' : 'Start free trial'}
        <Icon name="arrow_forward" size={17} />
      </Link>
    </div>
  )
}

export function PricingPage() {
  const { plans, isLoading, error, refetch } = useMembershipPlans()
  const [interval, setInterval] = useState<BillingInterval>('monthly')
  const intervals = [
    ...new Set(
      plans.filter((plan) => plan.priceCents > 0 && plan.slug !== 'enterprise').map((plan) => plan.billingInterval),
    ),
  ]
  const activeInterval = intervals.includes(interval) ? interval : intervals[0]
  const visiblePlans =
    intervals.length > 1
      ? plans.filter((plan) => plan.priceCents === 0 || plan.billingInterval === activeInterval)
      : plans

  return (
    <PublicLayout description="Compare current SupportHub plans, workspace prices and usage limits. Start with a free plan or a 14-day paid-plan trial.">
      <section className="marketing-page-hero marketing-pricing-hero">
        <div className="marketing-container">
          <span className="marketing-eyebrow">ROOM TO START. ROOM TO GROW.</span>
          <h1>
            Good support for your customers.
            <br />
            <span>A clear plan for your team.</span>
          </h1>
          <p>
            Start small. Grow when you’re ready. Every plan includes the full SupportHub feature set, with usage limits
            that fit your operation.
          </p>
          <div className="marketing-pricing-notes">
            <span>
              <Icon name="check" size={16} />
              Free Starter plan
            </span>
            <span>
              <Icon name="check" size={16} />
              14-day trials on paid plans
            </span>
            <span>
              <Icon name="check" size={16} />
              Pricing per workspace
            </span>
          </div>
        </div>
      </section>
      <section className="marketing-section marketing-pricing-body">
        <div className="marketing-container">
          {isLoading && <LoadingState label="Loading current plans…" />}
          {error && (
            <ErrorState
              title="We couldn’t load pricing"
              description="Current plans are temporarily unavailable. Please try again to see the latest prices."
              onRetry={refetch}
            />
          )}
          {!isLoading && !error && plans.length === 0 && (
            <div className="marketing-pricing-empty">
              <h2>Plans are being prepared.</h2>
              <p>Check again shortly, or contact us to discuss your team’s needs.</p>
              <div className="marketing-actions">
                <button type="button" className="marketing-button" onClick={refetch}>
                  Check again
                </button>
                <Link to={ROUTES.contact} className="marketing-text-link">
                  Contact us <Icon name="arrow_forward" size={18} />
                </Link>
              </div>
            </div>
          )}
          {!isLoading && !error && plans.length > 0 && (
            <>
              {intervals.length > 1 && (
                <div className="marketing-billing-toggle" role="group" aria-label="Billing interval">
                  {intervals.map((item) => (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={activeInterval === item}
                      onClick={() => setInterval(item)}
                    >
                      {item === 'monthly' ? 'Monthly' : 'Yearly'}
                    </button>
                  ))}
                </div>
              )}
              <div className="marketing-plans">
                {visiblePlans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
              <p className="marketing-pricing-currency">
                Prices are per workspace. Each paid plan shows its currency and billing interval.
              </p>
            </>
          )}
        </div>
      </section>
      {!isLoading && !error && plans.length > 0 && (
        <>
          <section className="marketing-section marketing-workflow-section">
            <div className="marketing-container">
              <div className="marketing-section-heading">
                <div>
                  <span className="marketing-eyebrow">THE DETAILS, SIDE BY SIDE</span>
                  <h2>Compare the limits.</h2>
                </div>
                <p className="text-on-surface-variant text-body-sm">All plans include the same core features.</p>
              </div>
              <div className="marketing-pricing-compare">
                <table>
                  <caption className="sr-only">Plan limits compared</caption>
                  <thead>
                    <tr>
                      <th scope="col">Workspace allowance</th>
                      {visiblePlans.map((plan) => (
                        <th key={plan.id} scope="col">
                          {plan.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {LIMIT_ROWS.map((row) => (
                      <tr key={row.key}>
                        <th scope="row">{row.label}</th>
                        {visiblePlans.map((plan) => (
                          <td key={plan.id}>{limitText(plan.limits[row.key])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
          <section className="marketing-section">
            <div className="marketing-container">
              <div className="marketing-section-heading marketing-heading-centered">
                <span className="marketing-eyebrow">THE FULL TOOLKIT</span>
                <h2>Included in every plan.</h2>
              </div>
              <ul className="marketing-included-grid">
                {ALL_PLANS_INCLUDE.map((item) => (
                  <li key={item}>
                    <Icon name="check_circle" size={18} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
      <section className="marketing-section marketing-workflow-section">
        <div className="marketing-container marketing-faq-section">
          <div>
            <span className="marketing-eyebrow">BEFORE YOU CHOOSE</span>
            <h2>Pricing questions.</h2>
            <p>Understand your plan, trial and usage limits.</p>
            <Link to={ROUTES.contact} className="marketing-text-link">
              Talk to us <Icon name="arrow_forward" size={18} />
            </Link>
          </div>
          <FaqList items={FAQ} />
        </div>
      </section>
      <PublicCta />
    </PublicLayout>
  )
}
