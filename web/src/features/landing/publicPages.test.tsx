import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/features/auth/hooks/useAuth'
import { LandingPage } from '@/features/landing/pages/LandingPage'
import { FeaturesPage } from '@/features/landing/pages/FeaturesPage'
import { SolutionsPage } from '@/features/landing/pages/SolutionsPage'
import { authApi } from '@/features/auth/api/authApi'
import { tokenStorage } from '@/services/storage/tokenStorage'
import { CookiesPage } from '@/features/legal/pages/CookiesPage'
import { PrivacyPage } from '@/features/legal/pages/PrivacyPage'
import { TermsPage } from '@/features/legal/pages/TermsPage'
import { PricingPage } from '@/features/tenants/pages/PricingPage'
import type { MembershipPlan } from '@/features/tenants/types'
import type { User } from '@/types/user'

const limits = { users: 3, customers: 100, ticketsPerMonth: 200, departments: 1, apiRequestsPerDay: 500, webhooks: 1 }
const unlimited = {
  users: null,
  customers: null,
  ticketsPerMonth: null,
  departments: null,
  apiRequestsPerDay: null,
  webhooks: null,
}

const PLANS: MembershipPlan[] = [
  {
    id: 1,
    name: 'Starter',
    slug: 'starter',
    description: 'Small teams',
    priceCents: 0,
    currency: 'USD',
    billingInterval: 'monthly',
    limits,
    isActive: true,
  },
  {
    id: 2,
    name: 'Professional',
    slug: 'professional',
    description: 'Growing teams',
    priceCents: 4900,
    currency: 'USD',
    billingInterval: 'monthly',
    limits,
    isActive: true,
  },
  {
    id: 4,
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'No usage limits',
    priceCents: 0,
    currency: 'USD',
    billingInterval: 'monthly',
    limits: unlimited,
    isActive: true,
  },
]

const retryPricing = vi.fn()
let planState: { plans: MembershipPlan[]; isLoading: boolean; error: Error | null; refetch: () => void }
vi.mock('@/features/tenants/hooks/useMembershipPlans', () => ({ useMembershipPlans: () => planState }))

beforeEach(() => {
  planState = { plans: PLANS, isLoading: false, error: null, refetch: retryPricing }
  retryPricing.mockClear()
})

function renderPage(page: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AuthProvider>{page}</AuthProvider>
    </MemoryRouter>,
  )
}

describe('public pages', () => {
  it('shows the home page with its sections and calls to action to a visitor', async () => {
    renderPage(<LandingPage />)

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/great support/i)
    expect(screen.getByRole('heading', { name: /everything a support team needs/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /frequently asked questions/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /start free trial/i }).length).toBeGreaterThan(0)
  })

  it('keeps the public homepage accessible to an existing customer', async () => {
    const user: User = {
      id: 1,
      name: 'Alex',
      email: 'alex@example.test',
      phone: null,
      avatarPath: null,
      timezone: 'UTC',
      isActive: true,
      emailVerifiedAt: '2026-10-11',
      lastLoginAt: null,
      roles: ['Administrator'],
      permissions: [],
      departments: [],
      customer: null,
    }
    const restore = vi.spyOn(authApi, 'me').mockResolvedValue(user)
    tokenStorage.set('sample-session')
    renderPage(<LandingPage />)
    expect(await screen.findByRole('link', { name: /open dashboard/i })).toHaveAttribute('href', '/dashboard')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/great support/i)
    restore.mockRestore()
  })

  it('offers keyboard-accessible mobile navigation and closes it with Escape', () => {
    renderPage(<LandingPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(screen.getByRole('navigation', { name: 'Mobile main' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('navigation', { name: 'Mobile main' })).not.toBeInTheDocument()
  })

  it('explains only the product capabilities available in the app', () => {
    renderPage(<FeaturesPage />)
    expect(screen.getByRole('heading', { name: /your support inbox, organized/i })).toBeInTheDocument()
    expect(screen.getByText('Mailgun inbound email integration')).toBeInTheDocument()
    expect(screen.getByText('Scoped API credentials and secret rotation')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /try the product tour/i })).toHaveAttribute('href', '/demo')
  })

  it('offers workflows for customer, IT and product teams', () => {
    renderPage(<SolutionsPage />)
    expect(screen.getByRole('heading', { name: /keep every customer in the loop/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /bring structure to incoming requests/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /connect support to your application/i })).toBeInTheDocument()
  })

  it('labels Starter as Free and Enterprise as Custom instead of showing $0', async () => {
    renderPage(<PricingPage />)

    const starter = (await screen.findByRole('heading', { name: 'Starter', level: 3 })).closest('div')!.parentElement!
    expect(within(starter).getByText('Free')).toBeInTheDocument()

    const enterprise = screen.getByRole('heading', { name: 'Enterprise', level: 3 }).closest('div')!.parentElement!
    expect(within(enterprise).getByText('Custom')).toBeInTheDocument()
    expect(within(enterprise).getByRole('link', { name: /contact us/i })).toBeInTheDocument()

    expect(screen.queryByText('$0')).not.toBeInTheDocument()
    expect(screen.getByText('$49')).toBeInTheDocument()
    expect(
      screen
        .getAllByRole('link', { name: /start free trial/i })
        .some((link) => link.getAttribute('href') === '/register?plan=professional'),
    ).toBe(true)
  })

  it('offers retry when prices cannot be loaded, without displaying invented prices', () => {
    planState = { ...planState, plans: [], error: new Error('Unavailable') }
    renderPage(<PricingPage />)
    expect(screen.getByText('We couldn’t load pricing')).toBeInTheDocument()
    expect(screen.queryByText('$49')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retry/i }))
    expect(retryPricing).toHaveBeenCalledOnce()
  })

  it('explains an empty plan catalog with contact and retry actions', () => {
    planState = { ...planState, plans: [] }
    renderPage(<PricingPage />)
    expect(screen.getByRole('heading', { name: /plans are being prepared/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /check again/i }))
    expect(retryPricing).toHaveBeenCalledOnce()
  })

  it('shows annual prices only when an annual plan is supplied by the API', () => {
    planState = {
      ...planState,
      plans: [
        ...PLANS,
        { ...PLANS[1], id: 5, slug: 'professional-yearly', priceCents: 58800, billingInterval: 'yearly' },
      ],
    }
    renderPage(<PricingPage />)
    expect(screen.getByText('$49')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Yearly' }))
    expect(screen.getByText('$588')).toBeInTheDocument()
    expect(screen.queryByText('$49')).not.toBeInTheDocument()
    expect(
      screen
        .getAllByRole('link', { name: /start free trial/i })
        .some((link) => link.getAttribute('href') === '/register?plan=professional-yearly'),
    ).toBe(true)
  })

  it('compares plan limits in a table, with unlimited shown for Enterprise', async () => {
    renderPage(<PricingPage />)

    const table = await screen.findByRole('table', { name: /plan limits compared/i })
    expect(within(table).getAllByText('Unlimited').length).toBe(6)
  })

  it.each([
    ['Terms of Service', <TermsPage key="t" />],
    ['Privacy Policy', <PrivacyPage key="p" />],
    ['Cookie Policy', <CookiesPage key="c" />],
  ])('renders the %s page with a last-updated date', async (title, page) => {
    renderPage(page)

    expect(await screen.findByRole('heading', { level: 1, name: title as string })).toBeInTheDocument()
    expect(screen.getByText(/last updated/i)).toBeInTheDocument()
  })
})
