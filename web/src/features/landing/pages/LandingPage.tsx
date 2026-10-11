import { Link, Navigate } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { Icon } from '@/components/ui/Icon'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { FaqList } from '@/features/landing/components/FaqList'
import type { FaqItem } from '@/features/landing/components/FaqList'
import { isPlatformAdmin } from '@/types/user'

const FEATURES = [
  {
    icon: 'confirmation_number',
    title: 'Ticket management',
    description: 'Create, assign, reply to, escalate, resolve and reopen tickets, with a full history of every status change and assignment.',
  },
  {
    icon: 'alt_route',
    title: 'Routing rules',
    description: 'Send new tickets to the right department or agent automatically, based on keywords and other conditions you define.',
  },
  {
    icon: 'timer',
    title: 'SLA tracking',
    description: 'Set first-response and resolution targets per priority and see at a glance which tickets are about to breach.',
  },
  {
    icon: 'groups',
    title: 'Departments and roles',
    description: 'Organize agents into departments and control exactly who can see, assign, close or configure what with role-based permissions.',
  },
  {
    icon: 'attach_file',
    title: 'Attachments and replies',
    description: 'Customers and agents reply in the same thread and attach screenshots and documents. Internal notes stay hidden from customers.',
  },
  {
    icon: 'notifications_active',
    title: 'Email notifications',
    description: 'Customers and agents are emailed when tickets are created, assigned, answered or resolved, with templates you can edit.',
  },
  {
    icon: 'monitoring',
    title: 'Reports and audit log',
    description: 'Follow ticket volume, SLA compliance and agent performance, and keep a record of who changed what for accountability.',
  },
  {
    icon: 'api',
    title: 'API and webhooks',
    description: 'Create tickets from your own website or CRM with an API key, and get signed webhook calls when tickets change.',
  },
]

const STEPS = [
  {
    title: 'Create your workspace',
    description: 'Sign up, name your organization and pick a plan. The free Starter plan needs no payment details, and paid plans start with a 14-day trial.',
  },
  {
    title: 'Set up your team',
    description: 'Add agents, group them into departments, choose priorities and categories, and add routing rules so tickets reach the right people.',
  },
  {
    title: 'Connect your customers',
    description: 'Let customers write in through your own site using the API, or give them accounts to follow their tickets and reply.',
  },
]

const SECURITY = [
  { icon: 'lock', text: 'Every organization’s tickets, customers and settings are kept separate from every other organization’s.' },
  { icon: 'admin_panel_settings', text: 'Role-based permissions limit what each person can see and do. Internal notes never reach customers.' },
  { icon: 'key', text: 'API secrets are stored hashed and shown once. Credentials carry scopes, so an integration can do only what you allow.' },
  { icon: 'verified', text: 'Webhook deliveries are signed so your server can confirm they came from SupportHub.' },
  { icon: 'history', text: 'An audit log records sensitive actions, including when an administrator signs in as another user.' },
]

const FAQ: FaqItem[] = [
  {
    question: 'Is there a free plan?',
    answer: 'Yes. The Starter plan is free, with limits on users, customers and monthly tickets. Paid plans raise those limits and start with a 14-day trial.',
  },
  {
    question: 'Can I use SupportHub from my own website?',
    answer: 'Yes. Create an API credential, then your website’s server can look up customers, open tickets, post replies with attachments, read the conversation and reopen tickets. Webhooks tell your site when an agent replies.',
  },
  {
    question: 'Is my data separate from other organizations?',
    answer: 'Yes. Each organization is its own workspace. People, tickets, settings and API credentials in one workspace are never visible from another.',
  },
  {
    question: 'What files can customers attach?',
    answer: 'Images (JPG, PNG, WebP), text files, PDFs, Word documents (DOCX) and PowerPoint files (PPT, PPTX), up to 2 MB each and 5 per message.',
  },
  {
    question: 'Can an administrator see what a team member sees?',
    answer: 'Administrators can sign in as an agent or customer in their organization to reproduce a problem. Every use is written to the audit log and the session expires automatically.',
  },
  {
    question: 'What happens if I outgrow a plan?',
    answer: 'You can change plans from the billing page. When you reach a limit, creating more of that item is blocked with a message naming the limit, and your existing data stays as it is.',
  },
]

const API_EXAMPLE = `curl -X POST https://your-supporthub/api/v1/integration/tickets \\
  -H "X-Api-Key: ak_..." -H "X-Api-Secret: as_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "subject": "Checkout is down",
    "description": "Customers cannot pay.",
    "customer_email": "jamie@example.com",
    "priority_id": 3
  }'`

export function LandingPage() {
  const { user } = useAuth()

  if (user) {
    return <Navigate to={isPlatformAdmin(user) ? ROUTES.platformDashboard : ROUTES.dashboard} replace />
  }

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-surface">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-space-xl px-margin-mobile py-space-xl sm:px-margin lg:grid-cols-2 lg:py-24">
          <div className="flex flex-col gap-space-lg">
            <span className="w-fit rounded-full bg-secondary-container px-space-md py-space-xs text-label-sm uppercase tracking-wider text-on-secondary-container">
              Help desk for multi-organization support
            </span>
            <h1 className="text-display-lg tracking-tight text-on-surface">Support your customers without losing track of any of them</h1>
            <p className="text-body-lg text-on-surface-variant">
              SupportHub gives every organization its own tickets, team, customers and integrations in one place, so answers
              reach customers faster and nothing gets lost between agents.
            </p>
            <div className="flex flex-wrap items-center gap-space-md">
              <Link
                to={ROUTES.register}
                className="inline-flex h-12 items-center rounded-lg bg-primary px-space-xl text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
              >
                Start free trial
              </Link>
              <Link
                to={ROUTES.pricing}
                className="inline-flex h-12 items-center rounded-lg bg-surface-container-low px-space-xl text-title-sm font-semibold text-on-surface transition-colors hover:bg-surface-container"
              >
                See pricing
              </Link>
            </div>
            <p className="text-body-sm text-on-surface-variant">Free Starter plan available. No payment details needed to begin.</p>
          </div>

          {/* A drawn preview of the ticket queue, not a screenshot. */}
          <div aria-hidden="true" className="rounded-2xl bg-surface-container-low p-space-lg shadow-sm">
            <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-title-sm font-semibold">Open tickets</span>
                <span className="rounded bg-surface-container px-2 py-0.5 text-code-sm text-secondary">3 need a reply</span>
              </div>
              {[
                { n: 'TKT-1042', s: 'Checkout is down', p: 'Urgent', c: 'bg-error', who: 'Billing' },
                { n: 'TKT-1041', s: 'Cannot reset my password', p: 'High', c: 'bg-primary-container', who: 'Accounts' },
                { n: 'TKT-1039', s: 'Invoice question for October', p: 'Medium', c: 'bg-tertiary', who: 'Billing' },
              ].map((t) => (
                <div key={t.n} className="flex items-center gap-space-md rounded-lg bg-surface-container-low p-space-md">
                  <span className={`h-8 w-1.5 rounded-full ${t.c}`} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-title-sm font-semibold">{t.s}</span>
                    <span className="text-code-sm text-secondary">
                      {t.n} · {t.who}
                    </span>
                  </div>
                  <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[11px] font-bold">{t.p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-16 bg-surface-container-low">
        <div className="mx-auto w-full max-w-6xl px-margin-mobile py-space-xl sm:px-margin lg:py-20">
          <div className="mx-auto mb-space-xl max-w-2xl text-center">
            <h2 className="text-headline-lg text-on-surface">Everything a support team needs</h2>
            <p className="mt-space-sm text-body-lg text-on-surface-variant">From the first message to the final resolution, in one workspace.</p>
          </div>
          <div className="grid gap-gutter-lg sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-fixed text-primary">
                  <Icon name={feature.icon} size={22} />
                </span>
                <h3 className="text-title-md font-semibold">{feature.title}</h3>
                <p className="text-body-sm text-on-surface-variant">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-16 bg-surface">
        <div className="mx-auto w-full max-w-6xl px-margin-mobile py-space-xl sm:px-margin lg:py-20">
          <div className="mx-auto mb-space-xl max-w-2xl text-center">
            <h2 className="text-headline-lg text-on-surface">Up and running in three steps</h2>
          </div>
          <ol className="grid gap-gutter-lg md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-title-sm font-bold text-on-primary">{index + 1}</span>
                <h3 className="text-title-md font-semibold">{step.title}</h3>
                <p className="text-body-sm text-on-surface-variant">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Connect your website */}
      <section className="bg-inverse-surface text-inverse-on-surface">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-space-xl px-margin-mobile py-space-xl sm:px-margin lg:grid-cols-2 lg:py-20">
          <div className="flex flex-col gap-space-md">
            <h2 className="text-headline-lg">Open tickets from your own website</h2>
            <p className="text-body-lg text-inverse-on-surface/80">
              Keep your customers on your site. Your server talks to SupportHub with an API key and secret to create tickets,
              attach files, read the conversation, and reopen tickets when a problem comes back.
            </p>
            <ul className="flex flex-col gap-space-xs text-body-md">
              {['Choose the department and priority per ticket', 'Safe retries with idempotency keys', 'Signed webhooks when an agent replies'].map((line) => (
                <li key={line} className="flex items-center gap-space-sm">
                  <Icon name="check_circle" size={18} filled className="text-tertiary-fixed-dim" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-on-background/60 p-space-lg text-code-sm leading-relaxed text-inverse-on-surface">
            <code>{API_EXAMPLE}</code>
          </pre>
        </div>
      </section>

      {/* Security */}
      <section className="bg-surface">
        <div className="mx-auto w-full max-w-6xl px-margin-mobile py-space-xl sm:px-margin lg:py-20">
          <div className="mx-auto mb-space-xl max-w-2xl text-center">
            <h2 className="text-headline-lg text-on-surface">Built to keep each organization’s data its own</h2>
          </div>
          <ul className="mx-auto grid max-w-4xl gap-space-md sm:grid-cols-2">
            {SECURITY.map((item) => (
              <li key={item.text} className="flex items-start gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
                <Icon name={item.icon} size={22} className="mt-0.5 shrink-0 text-tertiary" />
                <span className="text-body-md text-on-surface">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="bg-surface-container-low">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-space-md px-margin-mobile py-space-xl text-center sm:px-margin lg:py-16">
          <h2 className="text-headline-lg text-on-surface">Start free, pay when you grow</h2>
          <p className="max-w-2xl text-body-lg text-on-surface-variant">
            The Starter plan is free. Professional and Business raise the limits on team size, customers, tickets and API use,
            and Enterprise removes them.
          </p>
          <Link
            to={ROUTES.pricing}
            className="inline-flex h-11 items-center rounded-lg bg-surface-container-lowest px-space-lg text-title-sm font-semibold text-primary shadow-sm transition-colors hover:bg-surface-container-high"
          >
            Compare plans
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-surface">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-space-xl px-margin-mobile py-space-xl sm:px-margin lg:py-20">
          <h2 className="text-headline-lg text-on-surface">Frequently asked questions</h2>
          <FaqList items={FAQ} />
        </div>
      </section>

      {/* Final call to action */}
      <section className="bg-primary text-on-primary">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-space-md px-margin-mobile py-space-xl text-center sm:px-margin lg:py-16">
          <h2 className="text-headline-lg">Ready to give your customers faster answers?</h2>
          <p className="text-body-lg text-on-primary/90">Create your workspace in a few minutes.</p>
          <Link
            to={ROUTES.register}
            className="inline-flex h-12 items-center rounded-lg bg-surface-container-lowest px-space-xl text-title-sm font-semibold text-primary shadow-sm transition-colors hover:bg-surface-container-high"
          >
            Start free trial
          </Link>
        </div>
      </section>
    </PublicLayout>
  )
}
