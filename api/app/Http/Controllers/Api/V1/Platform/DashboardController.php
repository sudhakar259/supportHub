<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Models\MembershipPlan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * @group Platform Administration
 *
 * A single-call overview for the platform admin landing screen —
 * everything here is a cheap count query, not a report; GET
 * /platform/tenants already supports filtering/pagination for
 * anything needing the underlying rows.
 */
class DashboardController extends Controller
{
    /**
     * Platform-wide overview
     *
     * @response 200 {
     *   "success": true, "message": "Request successful.",
     *   "data": {
     *     "tenants": {"total": 12, "active": 9, "trial": 2, "suspended": 1},
     *     "platform_admins": 2,
     *     "subscriptions_by_plan": [{"plan": "Starter", "count": 7}]
     *   }
     * }
     */
    public function index(): JsonResponse
    {
        $tenantsByStatus = Tenant::query()
            ->selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $subscriptionsByPlan = Subscription::query()
            ->join('membership_plans', 'membership_plans.id', '=', 'subscriptions.membership_plan_id')
            ->groupBy('membership_plans.id', 'membership_plans.name')
            ->orderBy('membership_plans.name')
            ->pluck(DB::raw('count(*) as count'), 'membership_plans.name')
            ->map(fn ($count, $plan) => ['plan' => $plan, 'count' => $count])
            ->values();

        return $this->success([
            'tenants' => [
                'total' => $tenantsByStatus->sum(),
                'active' => $tenantsByStatus->get('active', 0),
                'trial' => $tenantsByStatus->get('trial', 0),
                'suspended' => $tenantsByStatus->get('suspended', 0),
            ],
            'platform_admins' => User::withoutTenantScope()->whereNull('tenant_id')->count(),
            'membership_plans' => MembershipPlan::where('is_active', true)->count(),
            'subscriptions_by_plan' => $subscriptionsByPlan,
        ]);
    }
}
