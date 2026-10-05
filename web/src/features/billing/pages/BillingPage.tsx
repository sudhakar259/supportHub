import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import type { BadgeTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { subscriptionApi } from '@/features/billing/api/subscriptionApi'
import { UsageBar } from '@/features/billing/components/UsageBar'
import { useInvoices } from '@/features/billing/hooks/useInvoices'
import { useSubscription } from '@/features/billing/hooks/useSubscription'
import { openRazorpayCheckout } from '@/features/billing/lib/razorpayCheckout'
import type { Invoice } from '@/features/billing/types'
import { useMembershipPlans } from '@/features/tenants/hooks/useMembershipPlans'
import { formatDateTime } from '@/utils/datetime'
import { formatPriceCents } from '@/utils/money'

const STATUS_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  trial: { label: 'Trial', tone: 'primary' },
  active: { label: 'Active', tone: 'tertiary' },
  past_due: { label: 'Past Due', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'danger' },
  suspended: { label: 'Suspended', tone: 'danger' },
  expired: { label: 'Expired', tone: 'danger' },
}

const INVOICE_BADGE: Record<Invoice['status'], { label: string; tone: BadgeTone }> = {
  pending: { label: 'Awaiting payment', tone: 'warning' },
  paid: { label: 'Paid', tone: 'tertiary' },
  void: { label: 'Void', tone: 'neutral' },
}

export function BillingPage() {
  const { subscription, isLoading, error, refetch } = useSubscription()
  const { invoices, isLoading: invoicesLoading, error: invoicesError, refetch: refetchInvoices } = useInvoices()
  const { plans } = useMembershipPlans()
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [payingInvoiceId, setPayingInvoiceId] = useState<number | null>(null)
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)

  if (isLoading) return <LoadingState label="Loading subscription…" />
  if (error || !subscription) return <ErrorState onRetry={refetch} description={error?.message} />

  const statusBadge = STATUS_BADGE[subscription.status] ?? { label: subscription.status, tone: 'neutral' as const }
  const otherPlans = plans.filter((p) => p.slug !== subscription.plan.slug)

  async function payInvoice(invoice: Invoice) {
    if (!invoice.checkout) return
    const checkout = invoice.checkout
    setPaymentMessage(null)
    setPayingInvoiceId(invoice.id)

    try {
      await openRazorpayCheckout({
        checkout,
        description: invoice.number,
        onSuccess: async (payment) => {
          try {
            await subscriptionApi.confirmPayment({
              razorpayOrderId: payment.razorpay_order_id,
              razorpayPaymentId: payment.razorpay_payment_id,
              razorpaySignature: payment.razorpay_signature,
            })
            setPaymentMessage(`Payment received for ${invoice.number}.`)
            refetch()
            refetchInvoices()
          } catch (err) {
            setPaymentMessage(err instanceof Error ? err.message : 'We could not confirm the payment.')
          } finally {
            setPayingInvoiceId(null)
          }
        },
        onDismiss: () => setPayingInvoiceId(null),
        onFailure: (message) => {
          setPaymentMessage(message)
          setPayingInvoiceId(null)
        },
      })
    } catch (err) {
      setPaymentMessage(err instanceof Error ? err.message : 'The payment form could not be opened.')
      setPayingInvoiceId(null)
    }
  }

  return (
    <div className="flex flex-col gap-space-lg pb-space-xl">
      <PageHeader breadcrumbs={[{ label: 'Settings' }, { label: 'Billing' }]} title="Billing & Subscription" />

      <div className="flex max-w-4xl flex-col gap-space-lg px-gutter-lg">
        <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
          <div className="flex flex-col items-start justify-between gap-space-sm sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-space-sm">
                <h2 className="text-headline-lg text-on-surface">{subscription.plan.name}</h2>
                <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
              </div>
              <p className="mt-1 text-body-md text-on-surface-variant">
                {formatPriceCents(subscription.plan.priceCents, subscription.plan.currency)}/
                {subscription.plan.billingInterval === 'monthly' ? 'month' : 'year'}
              </p>
            </div>
            {subscription.status !== 'cancelled' && (
              <Button variant="danger" leadingIcon="cancel" onClick={() => setIsCancelOpen(true)}>
                Cancel Subscription
              </Button>
            )}
          </div>

          {subscription.status === 'trial' && subscription.trialEndsAt && (
            <div className="flex items-center gap-space-sm rounded-lg bg-primary-fixed/30 p-space-md text-body-sm text-on-surface">
              <Icon name="schedule" size={18} className="text-primary" />
              Your trial ends {formatDateTime(subscription.trialEndsAt)}.
            </div>
          )}
          {subscription.status === 'active' && subscription.currentPeriodEndsAt && (
            <div className="flex items-center gap-space-sm rounded-lg bg-surface-container-low p-space-md text-body-sm text-on-surface">
              <Icon name="event" size={18} className="text-secondary" />
              Current billing period ends {formatDateTime(subscription.currentPeriodEndsAt)}.
            </div>
          )}
          {subscription.status === 'cancelled' && subscription.cancelledAt && (
            <div className="flex items-center gap-space-sm rounded-lg bg-error-container/40 p-space-md text-body-sm text-on-surface">
              <Icon name="info" size={18} className="text-error" />
              Cancelled on {formatDateTime(subscription.cancelledAt)}. Choose a plan below to resume.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
          <h2 className="text-headline-sm text-on-surface">Usage This Period</h2>
          <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-2">
            <UsageBar icon="group" label="Users" metric={subscription.usage.users} />
            <UsageBar icon="corporate_fare" label="Customers" metric={subscription.usage.customers} />
            <UsageBar icon="apartment" label="Departments" metric={subscription.usage.departments} />
            <UsageBar icon="confirmation_number" label="Tickets This Month" metric={subscription.usage.ticketsPerMonth} />
            <UsageBar icon="webhook" label="Webhooks" metric={subscription.usage.webhooks} />
            <UsageBar icon="vpn_key" label="API Credentials" metric={subscription.usage.apiCredentials} />
          </div>
        </div>

        {otherPlans.length > 0 && (
          <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
            <h2 className="text-headline-sm text-on-surface">Change Plan</h2>
            <div className="grid grid-cols-1 gap-space-sm sm:grid-cols-3">
              {otherPlans.map((plan) => (
                <div key={plan.id} className="flex flex-col gap-space-xs rounded-lg bg-surface-container-low p-space-md">
                  <span className="text-title-sm text-on-surface">{plan.name}</span>
                  <span className="text-body-sm text-secondary">{formatPriceCents(plan.priceCents, plan.currency)}/mo</span>
                  <Link
                    to={`${ROUTES.billingCheckout}?plan=${plan.slug}`}
                    className="mt-1 text-label-sm font-bold uppercase text-primary hover:underline"
                  >
                    Switch to this plan
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
          <div className="flex flex-col gap-space-xs sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-headline-sm text-on-surface">Invoices</h2>
            <p className="text-label-sm text-secondary">Payments are processed by Razorpay.</p>
          </div>

          {paymentMessage && <p className="text-body-sm text-on-surface">{paymentMessage}</p>}

          {invoicesError ? (
            <ErrorState onRetry={refetchInvoices} description={invoicesError.message} />
          ) : invoicesLoading ? (
            <LoadingState label="Loading invoices…" />
          ) : invoices.length === 0 ? (
            <EmptyState
              icon="receipt_long"
              title="No invoices yet"
              description="An invoice is issued when you move to a paid plan."
            />
          ) : (
            <ul className="divide-y divide-surface-container-high">
              {invoices.map((invoice) => {
                const badge = INVOICE_BADGE[invoice.status]
                return (
                  <li key={invoice.id} className="flex flex-col gap-space-xs py-space-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col">
                      <span className="text-title-sm text-on-surface">
                        {invoice.number}
                        {invoice.planName ? ` · ${invoice.planName}` : ''}
                      </span>
                      <span className="text-body-sm text-secondary">
                        {formatPriceCents(invoice.amountCents, invoice.currency)}
                        {invoice.paidAt ? ` · Paid ${formatDateTime(invoice.paidAt)}` : invoice.issuedAt ? ` · Issued ${formatDateTime(invoice.issuedAt)}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-space-sm">
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                      {invoice.status === 'pending' && invoice.checkout && (
                        <Button size="sm" isLoading={payingInvoiceId === invoice.id} onClick={() => payInvoice(invoice)}>
                          Pay now
                        </Button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        title="Cancel Subscription"
        description={`This immediately cancels your "${subscription.plan.name}" subscription. You can resume anytime by choosing a plan again.`}
        confirmLabel="Cancel Subscription"
        confirmText={subscription.plan.slug}
        onConfirm={async () => {
          await subscriptionApi.cancel()
          refetch()
        }}
        successMessage="Subscription cancelled."
      />
    </div>
  )
}
