<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Services\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Console\Command;

/**
 * Moves subscriptions into the lapse states that access enforcement reads:
 * a trial past its end, or a paid period past its end, becomes past_due,
 * then suspended after the grace period, then expired. Payment is what
 * moves a lapsed subscription back to active (MarkInvoicePaidAction).
 * Scheduled hourly (routes/console.php).
 */
class EnforceSubscriptionLapsesCommand extends Command
{
    protected $signature = 'billing:enforce-lapses';

    protected $description = 'Move trials and unpaid paid periods into past_due, suspended or expired.';

    public function handle(AuditLogger $audit, TenantContext $tenantContext): int
    {
        $moved = 0;

        Subscription::query()
            ->with('tenant')
            ->where(fn ($q) => $q->where('status', 'trial')->where('trial_ends_at', '<', now()))
            ->orWhere(fn ($q) => $q->whereIn('status', ['active', 'past_due', 'suspended'])->where('current_period_ends_at', '<', now()))
            ->chunkById(100, function ($subscriptions) use ($audit, $tenantContext, &$moved) {
                foreach ($subscriptions as $subscription) {
                    $target = $subscription->lapseTarget();

                    if ($target === null) {
                        continue;
                    }

                    $from = $subscription->status;
                    $subscription->update(['status' => $target]);
                    $moved++;

                    $tenantContext->runAs($subscription->tenant, fn () => $audit->log(
                        'subscription.lapsed',
                        $subscription,
                        ['status' => $from],
                        ['status' => $target],
                    ));
                }
            });

        $this->info("Moved {$moved} subscription(s) into a lapsed state.");

        return self::SUCCESS;
    }
}
