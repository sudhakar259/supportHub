<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\Subscription;
use App\Services\Billing\BillingUnavailableException;
use App\Services\Billing\RazorpayGateway;
use App\Support\TenantContext;
use Illuminate\Console\Command;

/**
 * Issues the invoice for the next billing period of every paid subscription
 * that ends within three days, so the tenant can pay before access lapses.
 * Scheduled hourly (routes/console.php). One pending renewal per subscription.
 */
class IssueRenewalInvoicesCommand extends Command
{
    protected $signature = 'billing:issue-renewals';

    protected $description = 'Issue renewal invoices for paid subscriptions whose billing period ends within three days.';

    public function handle(RazorpayGateway $gateway, TenantContext $tenantContext): int
    {
        $issued = 0;

        Subscription::query()
            ->with(['plan', 'tenant'])
            ->where('status', 'active')
            ->where('current_period_ends_at', '<=', now()->addDays(3))
            ->chunkById(100, function ($subscriptions) use ($gateway, $tenantContext, &$issued) {
                foreach ($subscriptions as $subscription) {
                    if ($this->issueRenewal($subscription, $gateway, $tenantContext)) {
                        $issued++;
                    }
                }
            });

        $this->info("Issued {$issued} renewal invoice(s).");

        return self::SUCCESS;
    }

    private function issueRenewal(Subscription $subscription, RazorpayGateway $gateway, TenantContext $tenantContext): bool
    {
        $plan = $subscription->plan;

        if (! $plan || $plan->price_cents === 0 || ! $subscription->tenant) {
            return false;
        }

        $alreadyIssued = Invoice::withoutTenantScope()
            ->where('subscription_id', $subscription->id)
            ->where('status', 'pending')
            ->exists();

        if ($alreadyIssued) {
            return false;
        }

        try {
            $order = $gateway->createOrder(
                $plan->price_cents,
                $plan->currency,
                "renew{$subscription->id}-{$subscription->current_period_ends_at->timestamp}",
            );
        } catch (BillingUnavailableException $e) {
            report($e);

            return false;
        }

        return (bool) $tenantContext->runAs($subscription->tenant, fn () => Invoice::create([
            'tenant_id' => $subscription->tenant_id,
            'subscription_id' => $subscription->id,
            'membership_plan_id' => $plan->id,
            'amount_cents' => $plan->price_cents,
            'currency' => $plan->currency,
            'billing_interval' => $plan->billing_interval,
            'status' => 'pending',
            'razorpay_order_id' => $order['id'],
        ]));
    }
}
