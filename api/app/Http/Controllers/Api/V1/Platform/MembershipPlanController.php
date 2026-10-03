<?php

namespace App\Http\Controllers\Api\V1\Platform;

use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\StoreMembershipPlanRequest;
use App\Http\Requests\Platform\UpdateMembershipPlanRequest;
use App\Http\Resources\MembershipPlanResource;
use App\Models\MembershipPlan;
use Illuminate\Http\JsonResponse;

/**
 * @group Platform Administration
 *
 * Membership plans a tenant can subscribe to (see POST
 * /tenants/register and GET /tenants/register's `plan` field).
 * Platform-level data — plans have no tenant_id of their own.
 */
class MembershipPlanController extends Controller
{
    /**
     * List membership plans
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "name": "Starter", "slug": "starter", "price_cents": 0}]}
     */
    public function index(): JsonResponse
    {
        return $this->success(MembershipPlanResource::collection(
            MembershipPlan::orderBy('sort_order')->get()
        ));
    }

    /**
     * Create a membership plan
     *
     * @bodyParam name string required Example: Growth
     * @bodyParam slug string required Example: growth
     * @bodyParam description string Example: For scaling support teams.
     * @bodyParam price_cents integer required In the smallest currency unit. Example: 9900
     * @bodyParam currency string Defaults to USD. Example: USD
     * @bodyParam billing_interval string required monthly or yearly. Example: monthly
     * @bodyParam limits object Feature limits; omit or null a key for unlimited. Example: {"users": 25, "customers": 5000}
     * @bodyParam is_active boolean Defaults to true. Example: true
     * @bodyParam sort_order integer Example: 2
     *
     * @response 201 {"success": true, "message": "Membership plan created successfully.", "data": {"id": 5, "name": "Growth", "slug": "growth"}}
     */
    public function store(StoreMembershipPlanRequest $request): JsonResponse
    {
        $plan = MembershipPlan::create($request->validated() + ['currency' => $request->input('currency', 'USD')]);

        return $this->created(new MembershipPlanResource($plan), 'Membership plan created successfully.');
    }

    /**
     * Update a membership plan
     *
     * Existing subscriptions are unaffected until their next billing
     * cycle re-evaluates limits — this only changes what NEW
     * subscriptions, and PlanLimitService's live checks for all
     * subscriptions, see going forward.
     *
     * @bodyParam name string Example: Growth
     * @bodyParam price_cents integer Example: 12900
     * @bodyParam limits object Example: {"users": 30}
     * @bodyParam is_active boolean Example: false
     *
     * @response 200 {"success": true, "message": "Membership plan updated successfully.", "data": {"id": 5, "name": "Growth"}}
     */
    public function update(UpdateMembershipPlanRequest $request, MembershipPlan $plan): JsonResponse
    {
        $plan->update($request->validated());

        return $this->success(new MembershipPlanResource($plan), 'Membership plan updated successfully.');
    }
}
