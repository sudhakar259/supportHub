<?php

namespace App\Actions\Billing;

use App\Models\Invoice;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\DB;

/**
 * Settles an invoice exactly once, whether the browser callback or the
 * webhook reports the payment first. A paid invoice activates the
 * subscription on the plan it was issued for, for one billing period.
 */
class MarkInvoicePaidAction
{
    public function execute(Invoice $invoice, string $paymentId): Invoice
    {
        if ($invoice->status === 'paid') {
            return $invoice;
        }

        DB::transaction(function () use ($invoice, $paymentId) {
            $invoice->update([
                'status' => 'paid',
                'razorpay_payment_id' => $paymentId,
                'paid_at' => now(),
            ]);

            $subscription = $invoice->subscription;

            if ($subscription && $subscription->membership_plan_id === $invoice->membership_plan_id) {
                // A renewal paid before the period ends extends it from that end date, so paying early never loses time.
                $periodStart = $subscription->current_period_ends_at?->isFuture() ? $subscription->current_period_ends_at : now();

                $subscription->update([
                    'status' => 'active',
                    'trial_ends_at' => null,
                    'current_period_ends_at' => $periodStart->copy()->addMonths($invoice->billing_interval === 'yearly' ? 12 : 1),
                    'cancelled_at' => null,
                ]);
            }
        });

        app(AuditLogger::class)->log('invoice.paid', $invoice, ['status' => 'pending'], ['status' => 'paid', 'payment_id' => $paymentId]);

        return $invoice->refresh();
    }
}
