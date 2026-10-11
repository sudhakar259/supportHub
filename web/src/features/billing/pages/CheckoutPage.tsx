import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { ROUTES } from '@/app/router/routes'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { subscriptionApi } from '@/features/billing/api/subscriptionApi'
import type { Invoice } from '@/features/billing/types'
import { openRazorpayCheckout } from '@/features/billing/lib/razorpayCheckout'
import { useMembershipPlans } from '@/features/tenants/hooks/useMembershipPlans'
import { ApiError } from '@/types/api'
import { formatPriceCents } from '@/utils/money'

type Stage = 'review' | 'paying' | 'paid' | 'unpaid'

export function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const planSlug = searchParams.get('plan')
  const { plans, isLoading } = useMembershipPlans()
  const [stage, setStage] = useState<Stage>('review')
  const [error, setError] = useState<string | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)

  const plan = plans.find((p) => p.slug === planSlug)

  if (isLoading) return <LoadingState label="Loading plan…" />
  if (!plan) return <ErrorState title="Plan not found" description="Pick a plan from Pricing or Billing to continue." />

  const interval = plan.billingInterval === 'monthly' ? 'mo' : 'yr'
  const breadcrumbs = [{ label: 'Settings' }, { label: 'Billing', to: ROUTES.billing }, { label: 'Checkout' }]

  async function handleConfirm() {
    if (!plan) return
    setError(null)
    setStage('paying')

    try {
      const { invoice: pending } = await subscriptionApi.changePlan(plan.slug)

      if (!pending?.checkout) {
        setStage('paid')
        return
      }

      setInvoice(pending)
      await openRazorpayCheckout({
        checkout: pending.checkout,
        description: `${plan.name} plan`,
        onSuccess: async (payment) => {
          try {
            const paidInvoice = await subscriptionApi.confirmPayment({
              razorpayOrderId: payment.razorpay_order_id,
              razorpayPaymentId: payment.razorpay_payment_id,
              razorpaySignature: payment.razorpay_signature,
            })
            setInvoice(paidInvoice)
            setStage('paid')
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'We could not confirm your payment. Check Billing shortly.')
            setStage('unpaid')
          }
        },
        onDismiss: () => setStage('unpaid'),
        onFailure: (message) => {
          setError(message)
          setStage('unpaid')
        },
      })
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Unable to reach the server.')
      setStage('review')
    }
  }

  if (stage === 'paid') {
    return (
      <div className="flex flex-col gap-space-md pb-space-xl">
        <PageHeader breadcrumbs={breadcrumbs} title="Subscription Updated" />
        <div className="flex max-w-xl flex-col items-center gap-space-lg px-gutter-lg py-space-xl text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-tertiary-fixed text-tertiary">
            <Icon name="verified" size={32} filled />
          </div>
          <div>
            <h2 className="text-headline-lg text-on-surface">You&rsquo;re now on {plan.name}</h2>
            <p className="mt-1 text-body-md text-on-surface-variant">
              {invoice
                ? `Payment received for ${invoice.number}. Your subscription is active.`
                : 'Your workspace limits have been updated.'}
            </p>
          </div>
          <Button size="lg" trailingIcon="arrow_forward" onClick={() => navigate(ROUTES.billing)}>
            Back to Billing
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader breadcrumbs={breadcrumbs} title="Confirm Your Plan" />

      <div className="grid max-w-5xl grid-cols-1 gap-gutter-lg px-gutter-lg lg:grid-cols-12">
        <div className="flex flex-col gap-space-lg lg:col-span-7">
          {error && <p className="text-body-sm text-error">{error}</p>}

          {stage === 'unpaid' && (
            <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
              <p className="text-body-md text-on-surface">
                Your plan change is saved, but the first payment is not complete. The subscription stays on trial until
                the invoice is paid.
              </p>
              <Link to={ROUTES.billing} className="text-label-sm font-bold uppercase text-primary hover:underline">
                Go to Billing to pay the invoice
              </Link>
            </div>
          )}

          <div className="flex flex-col gap-space-sm rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
            <h2 className="text-headline-sm text-on-surface">How payment works</h2>
            <p className="text-body-sm text-on-surface-variant">
              Payment is completed in Razorpay&rsquo;s secure checkout window. DeskZeal never receives or stores your
              card details.
            </p>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="sticky top-space-md flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm">
            <h2 className="text-headline-sm text-on-surface">Order Summary</h2>
            <div className="flex items-center justify-between">
              <span className="text-title-sm text-on-surface">{plan.name}</span>
              <span className="font-code-sm text-code-sm text-on-surface">
                {formatPriceCents(plan.priceCents, plan.currency)}/{interval}
              </span>
            </div>
            {plan.description && <p className="text-body-sm text-on-surface-variant">{plan.description}</p>}
            <div className="border-t border-surface-container-high pt-space-sm">
              <div className="flex items-center justify-between text-title-sm text-on-surface">
                <span>Due now</span>
                <span className="font-code-sm text-code-sm">
                  {plan.priceCents === 0 ? formatPriceCents(0, plan.currency) : formatPriceCents(plan.priceCents, plan.currency)}
                </span>
              </div>
            </div>
            <Button size="lg" isLoading={stage === 'paying'} onClick={handleConfirm} trailingIcon="arrow_forward">
              {plan.priceCents === 0 ? 'Confirm Plan Change' : 'Continue to Payment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
