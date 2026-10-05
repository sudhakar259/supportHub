import type { InvoiceCheckout } from '@/features/billing/types'

const CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js'

export interface RazorpaySuccess {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description: string
  handler: (response: RazorpaySuccess) => void
  modal: { ondismiss: () => void }
}

interface RazorpayInstance {
  open: () => void
  on: (event: 'payment.failed', handler: (response: { error: { description: string } }) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}

let scriptPromise: Promise<void> | null = null

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = CHECKOUT_SCRIPT_URL
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('The payment form could not be loaded. Check your connection and try again.'))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

export interface OpenCheckoutArgs {
  checkout: InvoiceCheckout
  description: string
  onSuccess: (payment: RazorpaySuccess) => void
  onDismiss: () => void
  onFailure: (message: string) => void
}

/**
 * Opens Razorpay Checkout for an invoice's order. Card details are entered
 * inside Razorpay's own frame; this app only receives the signed result.
 */
export async function openRazorpayCheckout({ checkout, description, onSuccess, onDismiss, onFailure }: OpenCheckoutArgs): Promise<void> {
  await loadCheckoutScript()

  if (!window.Razorpay) {
    onFailure('The payment form is not available in this browser.')
    return
  }

  const instance = new window.Razorpay({
    key: checkout.keyId,
    amount: checkout.amountCents,
    currency: checkout.currency,
    order_id: checkout.orderId,
    name: 'SupportHub',
    description,
    handler: onSuccess,
    modal: { ondismiss: onDismiss },
  })

  instance.on('payment.failed', (response) => onFailure(response.error.description))
  instance.open()
}
