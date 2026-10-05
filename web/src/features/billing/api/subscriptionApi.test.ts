import { beforeEach, describe, expect, it, vi } from 'vitest'

import { subscriptionApi } from '@/features/billing/api/subscriptionApi'
import { apiFetch } from '@/services/api/client'

vi.mock('@/services/api/client', () => ({ apiFetch: vi.fn() }))

const rawPlan = { id: 2, name: 'Professional', slug: 'professional', description: null, price_cents: 4900, currency: 'USD', billing_interval: 'monthly', limits: {}, is_active: true }
const rawSubscription = {
  id: 1,
  status: 'trial',
  plan: rawPlan,
  trial_ends_at: null,
  current_period_ends_at: null,
  cancelled_at: null,
  usage: {
    users: { used: 1, limit: 15 },
    customers: { used: 0, limit: null },
    departments: { used: 1, limit: 5 },
    tickets_per_month: { used: 0, limit: 2000 },
    webhooks: { used: 0, limit: 5 },
    api_credentials: { used: 0, limit: null },
  },
}

beforeEach(() => {
  vi.mocked(apiFetch).mockReset()
})

describe('subscriptionApi.changePlan', () => {
  it('maps the pending invoice and its Razorpay checkout details', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ...rawSubscription,
      invoice: {
        id: 7,
        number: 'INV-000007',
        status: 'pending',
        amount_cents: 4900,
        currency: 'USD',
        billing_interval: 'monthly',
        plan: { name: 'Professional', slug: 'professional' },
        paid_at: null,
        issued_at: '2026-10-05T10:00:00Z',
        checkout: { key_id: 'rzp_test_key', order_id: 'order_ABC', amount_cents: 4900, currency: 'USD' },
      },
    })

    const result = await subscriptionApi.changePlan('professional')

    expect(result.invoice).toMatchObject({
      number: 'INV-000007',
      status: 'pending',
      amountCents: 4900,
      planName: 'Professional',
      checkout: { keyId: 'rzp_test_key', orderId: 'order_ABC', amountCents: 4900, currency: 'USD' },
    })
    expect(result.subscription.plan.slug).toBe('professional')
  })

  it('returns no invoice for a free plan', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ...rawSubscription, invoice: null })

    const result = await subscriptionApi.changePlan('starter')

    expect(result.invoice).toBeNull()
  })
})
