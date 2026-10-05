import type { MembershipPlan } from '@/features/tenants/types'

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'suspended' | 'expired'

export interface UsageMetric {
  used: number
  limit: number | null
}

export interface SubscriptionUsage {
  users: UsageMetric
  customers: UsageMetric
  departments: UsageMetric
  ticketsPerMonth: UsageMetric
  webhooks: UsageMetric
  apiCredentials: UsageMetric
}

export interface Subscription {
  id: number
  status: SubscriptionStatus
  plan: MembershipPlan
  trialEndsAt: string | null
  currentPeriodEndsAt: string | null
  cancelledAt: string | null
  usage: SubscriptionUsage
}

export type InvoiceStatus = 'pending' | 'paid' | 'void'

export interface InvoiceCheckout {
  keyId: string
  orderId: string
  amountCents: number
  currency: string
}

export interface Invoice {
  id: number
  number: string
  status: InvoiceStatus
  amountCents: number
  currency: string
  billingInterval: 'monthly' | 'yearly'
  planName: string | null
  paidAt: string | null
  issuedAt: string | null
  checkout: InvoiceCheckout | null
}
