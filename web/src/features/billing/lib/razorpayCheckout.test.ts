import { afterEach, describe, expect, it, vi } from 'vitest'

import { openRazorpayCheckout } from '@/features/billing/lib/razorpayCheckout'

const checkout = { keyId: 'rzp_test_key', orderId: 'order_ABC', amountCents: 4900, currency: 'USD' }

afterEach(() => {
  delete window.Razorpay
})

describe('openRazorpayCheckout', () => {
  it('opens checkout for the invoice order and reports a successful payment', async () => {
    const open = vi.fn()
    let captured: { key: string; order_id: string; amount: number; handler: (r: unknown) => void } | null = null
    window.Razorpay = vi.fn(function (options) {
      captured = options as unknown as typeof captured
      return { open, on: vi.fn() }
    }) as unknown as typeof window.Razorpay

    const onSuccess = vi.fn()
    await openRazorpayCheckout({ checkout, description: 'Professional plan', onSuccess, onDismiss: vi.fn(), onFailure: vi.fn() })

    expect(open).toHaveBeenCalledOnce()
    expect(captured).toMatchObject({ key: 'rzp_test_key', order_id: 'order_ABC', amount: 4900 })

    captured!.handler({ razorpay_order_id: 'order_ABC', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig' })
    expect(onSuccess).toHaveBeenCalledWith({ razorpay_order_id: 'order_ABC', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig' })
  })

  it('reports a failed payment with the provider description', async () => {
    const handlers: Record<string, (r: { error: { description: string } }) => void> = {}
    window.Razorpay = vi.fn(function () {
      return {
        open: vi.fn(),
        on: (event: string, handler: (r: { error: { description: string } }) => void) => {
          handlers[event] = handler
        },
      }
    }) as unknown as typeof window.Razorpay

    const onFailure = vi.fn()
    await openRazorpayCheckout({ checkout, description: 'Professional plan', onSuccess: vi.fn(), onDismiss: vi.fn(), onFailure })

    handlers['payment.failed']({ error: { description: 'Card declined' } })
    expect(onFailure).toHaveBeenCalledWith('Card declined')
  })
})
