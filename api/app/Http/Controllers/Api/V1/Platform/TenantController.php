<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\UpdateTenantRequest;
use App\Http\Resources\TenantResource;
use App\Models\MembershipPlan;
use App\Models\Subscription;
use App\Models\SystemSetting;
use App\Models\Tenant;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * @group Platform Administration
 *
 * Tenant management for platform operators. Every route here requires
 * the Platform Admin role — a population entirely separate from any
 * tenant's own "Administrator" (see RequirePlatformAdmin). None of
 * these endpoints are reachable by a tenant user, no matter their
 * role within their own tenant.
 */
class TenantController extends Controller
{
    /**
     * List tenants
     *
     * @queryParam filter[status] active, trial or suspended. Example: trial
     * @queryParam filter[name] Partial name match. Example: Acme
     * @queryParam sort Sort by name or created_at. Example: -created_at
     * @queryParam per_page Items per page (max 100). Example: 25
     *
     * @response 200 {
     *   "success": true, "message": "Request successful.",
     *   "data": [{"id": 2, "name": "Acme Support", "slug": "acme-support", "status": "active", "users_count": 9}]
     * }
     */
    public function index(Request $request): JsonResponse
    {
        $tenants = QueryBuilder::for(Tenant::class)
            ->allowedFilters(
                AllowedFilter::exact('status'),
                AllowedFilter::partial('name'),
            )
            ->allowedSorts('name', 'created_at')
            ->with('subscription.plan')
            ->withCount(['users', 'customers', 'tickets'])
            ->defaultSort('-created_at')
            ->paginate(min((int) $request->integer('per_page', 25), 100));

        return $this->success(TenantResource::collection($tenants));
    }

    /**
     * Get a tenant
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": 2, "name": "Acme Support", "users_count": 9}}
     */
    public function show(Tenant $tenant): JsonResponse
    {
        return $this->success(new TenantResource(
            $tenant->load('subscription.plan')->loadCount(['users', 'customers', 'tickets'])
        ));
    }

    /**
     * Update a tenant
     *
     * @bodyParam name string Example: Acme Support Inc.
     * @bodyParam email string Example: billing@acme.com
     * @bodyParam phone string Example: +1-555-0100
     * @bodyParam website string Example: https://acme.com
     * @bodyParam country string Example: US
     * @bodyParam timezone string Example: America/New_York
     *
     * @response 200 {"success": true, "message": "Tenant updated successfully.", "data": {"id": 2, "name": "Acme Support Inc."}}
     */
    public function update(UpdateTenantRequest $request, Tenant $tenant): JsonResponse
    {
        $oldValues = $tenant->only(array_keys($request->validated()));

        $tenant->update($request->validated());

        app(AuditLogger::class)->log('platform.tenant.updated', $tenant, $oldValues, $request->validated(), $request->user());

        return $this->success(new TenantResource($tenant), 'Tenant updated successfully.');
    }

    /**
     * Suspend a tenant
     *
     * Immediately blocks every user of this tenant from authenticating
     * further (ResolveTenantContext rejects any tenant that isn't
     * active/trial) and from registering new accounts. Existing Sanctum
     * tokens are not individually revoked — they simply stop working
     * the next time they hit a tenant-scoped route.
     *
     * @response 200 {"success": true, "message": "Tenant suspended successfully.", "data": {"id": 2, "status": "suspended"}}
     */
    public function suspend(Request $request, Tenant $tenant): JsonResponse
    {
        $tenant->update(['status' => 'suspended', 'suspended_at' => now()]);

        app(AuditLogger::class)->log('platform.tenant.suspended', $tenant, null, null, $request->user());

        return $this->success(new TenantResource($tenant), 'Tenant suspended successfully.');
    }

    /**
     * Activate (or reactivate) a tenant
     *
     * @response 200 {"success": true, "message": "Tenant activated successfully.", "data": {"id": 2, "status": "active"}}
     */
    public function activate(Request $request, Tenant $tenant): JsonResponse
    {
        $tenant->update(['status' => 'active', 'suspended_at' => null]);

        app(AuditLogger::class)->log('platform.tenant.activated', $tenant, null, null, $request->user());

        return $this->success(new TenantResource($tenant), 'Tenant activated successfully.');
    }

    /**
     * Assign a membership plan to a tenant
     *
     * Same rules as the tenant's own plan change: a free plan is active with no
     * trial, a paid plan starts a 14-day trial. Creates the subscription if the
     * tenant has none.
     *
     * @bodyParam plan string required Active plan slug. Example: professional
     *
     * @response 200 {"success": true, "message": "Plan updated successfully.", "data": {"id": 2}}
     */
    public function changePlan(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate(['plan' => ['required', 'string', 'exists:membership_plans,slug']]);
        $plan = MembershipPlan::where('slug', $data['plan'])->where('is_active', true)->firstOrFail();
        $isFree = $plan->price_cents === 0;

        $before = Subscription::where('tenant_id', $tenant->id)->first()?->only(['membership_plan_id', 'status']);

        $subscription = Subscription::updateOrCreate(
            ['tenant_id' => $tenant->id],
            [
                'membership_plan_id' => $plan->id,
                'status' => $isFree ? 'active' : 'trial',
                'trial_ends_at' => $isFree ? null : now()->addDays(14),
                'cancelled_at' => null,
            ],
        );

        app(AuditLogger::class)->log('platform.subscription.changed', $subscription, $before, ['membership_plan_id' => $plan->id, 'status' => $subscription->status], $request->user());

        return $this->success(new TenantResource($tenant->load('subscription.plan')->loadCount(['users', 'customers', 'tickets'])), 'Plan updated successfully.');
    }

    /**
     * Verify a tenant's sending domain
     *
     * Marks the tenant's `email.sending_domain` as having SPF/DKIM in place.
     * Only then, and only on a plan above Starter, do the tenant's emails go
     * out from support@<domain> instead of the platform address.
     *
     * @bodyParam verified boolean required Example: true
     *
     * @response 200 {"success": true, "message": "Sending domain updated successfully.", "data": {"verified": true}}
     */
    public function verifyEmailDomain(Request $request, Tenant $tenant): JsonResponse
    {
        $data = $request->validate(['verified' => ['required', 'boolean']]);

        $hasDomain = SystemSetting::withoutTenantScope()
            ->where('tenant_id', $tenant->id)->where('key', 'email.sending_domain')->whereNotNull('value')->exists();
        abort_if($data['verified'] && ! $hasDomain, 422, 'The tenant has not set an email.sending_domain.');

        SystemSetting::withoutTenantScope()->updateOrCreate(
            ['tenant_id' => $tenant->id, 'key' => 'email.domain_verified'],
            ['value' => $data['verified'] ? '1' : '0', 'type' => 'boolean', 'group' => 'email', 'is_public' => false]
        );

        app(AuditLogger::class)->log('platform.tenant.email_domain_verified', $tenant, null, ['verified' => $data['verified']], $request->user());

        return $this->success(['verified' => $data['verified']], 'Sending domain updated successfully.');
    }
}
