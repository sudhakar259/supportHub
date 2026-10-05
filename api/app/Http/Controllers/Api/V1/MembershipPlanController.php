<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\MembershipPlanResource;
use App\Models\MembershipPlan;
use Illuminate\Http\JsonResponse;

/**
 * @group Membership Plans
 *
 * Public plan catalog for the pricing page and tenant registration's
 * `plan` field — unauthenticated, read-only, mirrors the public
 * /tenants/register and /tenants/lookup/{slug} endpoints. Only active
 * plans are listed; platform administrators manage the full catalog
 * (including inactive/retired plans) via Platform\MembershipPlanController.
 */
class MembershipPlanController extends Controller
{
    /**
     * List active membership plans
     *
     * @unauthenticated
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "name": "Starter", "slug": "starter", "price_cents": 0}]}
     */
    public function index(): JsonResponse
    {
        return $this->success(MembershipPlanResource::collection(
            MembershipPlan::where('is_active', true)->orderBy('sort_order')->get()
        ));
    }
}
