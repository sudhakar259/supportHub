import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { AuthProvider } from '@/features/auth/hooks/useAuth'
import { LandingPage } from '@/features/landing/pages/LandingPage'
import { CookiesPage } from '@/features/legal/pages/CookiesPage'
import { PrivacyPage } from '@/features/legal/pages/PrivacyPage'
import { TermsPage } from '@/features/legal/pages/TermsPage'
import { PricingPage } from '@/features/tenants/pages/PricingPage'
import type { MembershipPlan } from '@/features/tenants/types'

const limits = { users: 3, customers: 100, ticketsPerMonth: 200, departments: 1, apiRequestsPerDay: 500, webhooks: 1 }
const unlimited = { users: null, customers: null, ticketsPerMonth: null, departments: null, apiRequestsPerDay: null, webhooks: null }

const PLANS: MembershipPlan[] = [
  { id: 1, name: 'Starter', slug: 'starter', description: 'Small teams', priceCents: 0, currency: 'USD', billingInterval: 'monthly', limits, isActive: true },
  { id: 2, name: 'Professional', slug: 'professional', description: 'Growing teams', priceCents: 4900, currency: 'USD', billingInterval: 'monthly', limits, isActive: true },
  { id: 4, name: 'Enterprise', slug: 'enterprise', description: 'No usage limits', priceCents: 0, currency: 'USD', billingInterval: 'monthly', limits: unlimited, isActive: true },
]

vi.mock('@/features/tenants/hooks/useMembershipPlans', () => ({
  useMembershipPlans: () => ({ plans: PLANS, isLoading: false, error: null }),
}))

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

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/support your customers/i)
    expect(screen.getByRole('heading', { name: /everything a support team needs/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /frequently asked questions/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /start free trial/i }).length).toBeGreaterThan(0)
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
