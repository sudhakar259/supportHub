<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Subscription\UpdateSubscriptionRequest;
use App\Http\Resources\InvoiceResource;
use App\Http\Resources\SubscriptionResource;
use App\Models\Invoice;
use App\Models\MembershipPlan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Services\Billing\RazorpayGateway;
use App\Services\PlanLimitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @group Billing
 *
 * A tenant's own view of its subscription — distinct from
 * Platform\TenantController, which lets a platform administrator see
 * every tenant's subscription. Moving to a paid plan issues an invoice
 * with a Razorpay order; the subscription is activated when that invoice
 * is paid (see InvoiceController and MarkInvoicePaidAction).
 */
class SubscriptionController extends Controller
{
    private const USAGE_FEATURES = ['users', 'customers', 'departments', 'tickets_per_month', 'webhooks', 'api_credentials'];

    /**
     * Get the current subscription
     *
     * Includes a `usage` block (one entry per plan-limited feature)
     * computed live via PlanLimitService — the same service every
     * resource-creating controller already uses to enforce limits, so
     * this can never drift from what creation actually allows.
     *
     * @response 200 {
     *   "success": true, "message": "Request successful.",
     *   "data": {"id": 1, "status": "trial", "plan": {"name": "Starter"}, "usage": {"users": {"used": 2, "limit": 3}}}
     * }
     */
    public function show(Request $request): JsonResponse
    {
        if (! $request->user()->can('billing.view')) {
            return $this->error('You do not have permission to perform this action.', 403);
        }

        $tenant = $request->user()->tenant;
        $subscription = $tenant->subscription()->with('plan')->firstOrFail();

        return $this->success($this->withUsage($subscription, $tenant));
    }

    /**
     * Change plan
     *
     * A free plan activates immediately. A paid plan starts a 14-day
     * trial and issues an invoice for the plan price, with a Razorpay
     * order to pay it; the subscription is activated once the invoice is
     * paid. A lapsed subscription (past_due, suspended or expired) gets no
     * new trial and keeps its lapsed status until that invoice is paid.
     * Earlier unpaid invoices are voided. If the payment provider
     * cannot create the order, nothing changes and the request returns 503.
     *
     * @bodyParam plan string required The membership plan slug to switch to. Example: professional
     *
     * @response 200 {"success": true, "message": "Plan updated successfully.", "data": {"status": "trial", "plan": {"slug": "professional"}, "invoice": {"status": "pending"}}}
     */
    public function update(UpdateSubscriptionRequest $request, RazorpayGateway $gateway): JsonResponse
    {
        $tenant = $request->user()->tenant;
        $subscription = $tenant->subscription()->firstOrFail();
        $plan = MembershipPlan::where('slug', $request->string('plan'))->where('is_active', true)->firstOrFail();
        $isFree = $plan->price_cents === 0;

        $order = $isFree ? null : $gateway->createOrder(
            $plan->price_cents,
            $plan->currency,
            "sub{$subscription->id}-{$plan->slug}-".now()->timestamp,
        );

        $keepLapsed = ! $isFree && $subscription->isLapsed();

        $invoice = DB::transaction(function () use ($tenant, $subscription, $plan, $isFree, $order, $keepLapsed) {
            $subscription->update([
                'membership_plan_id' => $plan->id,
                'status' => $isFree ? 'active' : ($keepLapsed ? $subscription->status : 'trial'),
                'trial_ends_at' => $isFree || $keepLapsed ? null : now()->addDays(14),
                // A lingering cancelled_at would contradict the new status.
                'cancelled_at' => null,
            ]);

            if ($order === null) {
                return null;
            }

            Invoice::where('tenant_id', $tenant->id)->where('status', 'pending')->update(['status' => 'void']);

            return Invoice::create([
                'tenant_id' => $tenant->id,
                'subscription_id' => $subscription->id,
                'membership_plan_id' => $plan->id,
                'amount_cents' => $plan->price_cents,
                'currency' => $plan->currency,
                'billing_interval' => $plan->billing_interval,
                'status' => 'pending',
                'razorpay_order_id' => $order['id'],
            ]);
        });

        $payload = $this->withUsage($subscription->fresh('plan'), $tenant);
        $payload['invoice'] = $invoice ? (new InvoiceResource($invoice->load('plan')))->resolve($request) : null;

        return $this->success($payload, 'Plan updated successfully.');
    }

    /**
     * Cancel the subscription
     *
     * @response 200 {"success": true, "message": "Subscription cancelled.", "data": {"status": "cancelled"}}
     */
    public function cancel(Request $request): JsonResponse
    {
        if (! $request->user()->can('billing.manage')) {
            return $this->error('You do not have permission to perform this action.', 403);
        }

        $tenant = $request->user()->tenant;
        $subscription = $tenant->subscription()->firstOrFail();

        $subscription->update(['status' => 'cancelled', 'cancelled_at' => now()]);

        return $this->success($this->withUsage($subscription->fresh('plan'), $tenant), 'Subscription cancelled.');
    }

    private function withUsage(Subscription $subscription, Tenant $tenant): array
    {
        $usageService = app(PlanLimitService::class);

        $usage = [];
        foreach (self::USAGE_FEATURES as $feature) {
            $usage[$feature] = [
                'used' => $usageService->usage($tenant, $feature),
                'limit' => $usageService->limit($tenant, $feature),
            ];
        }

        return array_merge((new SubscriptionResource($subscription))->resolve(request()), ['usage' => $usage]);
    }
}
