import type { Invoice, Subscription, SubscriptionStatus, SubscriptionUsage, UsageMetric } from '@/features/billing/types'
import type { RawMembershipPlan } from '@/features/tenants/api/membershipPlansApi'
import { mapMembershipPlan } from '@/features/tenants/api/membershipPlansApi'
import { apiFetch } from '@/services/api/client'

interface RawUsageMetric {
  used: number
  limit: number | null
}

/** Mirrors the `usage` block SubscriptionController::withUsage() merges onto SubscriptionResource. */
interface RawSubscription {
  id: number
  status: SubscriptionStatus
  plan: RawMembershipPlan
  trial_ends_at: string | null
  current_period_ends_at: string | null
  cancelled_at: string | null
  usage: {
    users: RawUsageMetric
    customers: RawUsageMetric
    departments: RawUsageMetric
    tickets_per_month: RawUsageMetric
    webhooks: RawUsageMetric
    api_credentials: RawUsageMetric
  }
}

interface RawInvoice {
  id: number
  number: string
  status: Invoice['status']
  amount_cents: number
  currency: string
  billing_interval: Invoice['billingInterval']
  plan?: { name: string; slug: string }
  paid_at: string | null
  issued_at: string | null
  checkout: {
    key_id: string
    order_id: string
    amount_cents: number
    currency: string
  } | null
}

interface RawChangePlanResponse extends RawSubscription {
  invoice: RawInvoice | null
}

function mapUsageMetric(raw: RawUsageMetric): UsageMetric {
  return { used: raw.used, limit: raw.limit }
}

function mapSubscription(raw: RawSubscription): Subscription {
  const usage: SubscriptionUsage = {
    users: mapUsageMetric(raw.usage.users),
    customers: mapUsageMetric(raw.usage.customers),
    departments: mapUsageMetric(raw.usage.departments),
    ticketsPerMonth: mapUsageMetric(raw.usage.tickets_per_month),
    webhooks: mapUsageMetric(raw.usage.webhooks),
    apiCredentials: mapUsageMetric(raw.usage.api_credentials),
  }

  return {
    id: raw.id,
    status: raw.status,
    plan: mapMembershipPlan(raw.plan),
    trialEndsAt: raw.trial_ends_at,
    currentPeriodEndsAt: raw.current_period_ends_at,
    cancelledAt: raw.cancelled_at,
    usage,
  }
}

function mapInvoice(raw: RawInvoice): Invoice {
  return {
    id: raw.id,
    number: raw.number,
    status: raw.status,
    amountCents: raw.amount_cents,
    currency: raw.currency,
    billingInterval: raw.billing_interval,
    planName: raw.plan?.name ?? null,
    paidAt: raw.paid_at,
    issuedAt: raw.issued_at,
    checkout: raw.checkout
      ? {
          keyId: raw.checkout.key_id,
          orderId: raw.checkout.order_id,
          amountCents: raw.checkout.amount_cents,
          currency: raw.checkout.currency,
        }
      : null,
  }
}

export interface ChangePlanResult {
  subscription: Subscription
  invoice: Invoice | null
}

export interface PaymentConfirmation {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

/** Maps 1:1 to api/routes/api/subscription.php — see SubscriptionController.php and InvoiceController.php. */
export const subscriptionApi = {
  async get(): Promise<Subscription> {
    const raw = await apiFetch<RawSubscription>('/subscription')
    return mapSubscription(raw)
  },

  async changePlan(plan: string): Promise<ChangePlanResult> {
    const raw = await apiFetch<RawChangePlanResponse>('/subscription', { method: 'PUT', body: { plan } })
    return {
      subscription: mapSubscription(raw),
      invoice: raw.invoice ? mapInvoice(raw.invoice) : null,
    }
  },

  async cancel(): Promise<Subscription> {
    const raw = await apiFetch<RawSubscription>('/subscription/cancel', { method: 'POST' })
    return mapSubscription(raw)
  },

  async listInvoices(): Promise<Invoice[]> {
    const raw = await apiFetch<RawInvoice[]>('/subscription/invoices')
    return raw.map(mapInvoice)
  },

  async confirmPayment(payment: PaymentConfirmation): Promise<Invoice> {
    const raw = await apiFetch<RawInvoice>('/subscription/payments/verify', {
      method: 'POST',
      body: {
        razorpay_order_id: payment.razorpayOrderId,
        razorpay_payment_id: payment.razorpayPaymentId,
        razorpay_signature: payment.razorpaySignature,
      },
    })
    return mapInvoice(raw)
  },
}
