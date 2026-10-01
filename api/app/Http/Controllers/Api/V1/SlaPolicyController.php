<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sla\StoreSlaPolicyRequest;
use App\Http\Requests\Sla\UpdateSlaPolicyRequest;
use App\Http\Resources\SlaPolicyResource;
use App\Models\SlaPolicy;
use Illuminate\Http\JsonResponse;

/**
 * @group SLA
 *
 * SLA policies define first-response and resolution deadlines. The
 * most specific match wins when a ticket's SLA is calculated: priority
 * + department, falling back to a department-less default for that
 * priority — see CalculateSlaAction and docs/ticket-workflow.md.
 */
class SlaPolicyController extends Controller
{
    /**
     * List SLA policies
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "name": "Urgent Priority SLA"}]}
     */
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', SlaPolicy::class);

        $policies = SlaPolicy::with(['priority', 'department'])->get();

        return $this->success(SlaPolicyResource::collection($policies));
    }

    /**
     * Create an SLA policy
     *
     * @bodyParam name string required Example: VIP Customer SLA
     * @bodyParam priority_id integer Applies to all priorities if omitted. Example: 4
     * @bodyParam department_id integer Applies to all departments if omitted. Example: 2
     * @bodyParam first_response_minutes integer required Example: 15
     * @bodyParam resolution_minutes integer required Example: 120
     * @bodyParam business_hours_only boolean Example: false
     *
     * @response 201 {"success": true, "message": "SLA policy created successfully.", "data": {"id": 5, "name": "VIP Customer SLA"}}
     */
    public function store(StoreSlaPolicyRequest $request): JsonResponse
    {
        $policy = SlaPolicy::create($request->validated());

        return $this->created(new SlaPolicyResource($policy), 'SLA policy created successfully.');
    }

    /**
     * Get an SLA policy
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": 1, "name": "Urgent Priority SLA"}}
     */
    public function show(SlaPolicy $policy): JsonResponse
    {
        $this->authorize('view', $policy);

        return $this->success(new SlaPolicyResource($policy->load(['priority', 'department'])));
    }

    /**
     * Update an SLA policy
     *
     * @bodyParam first_response_minutes integer Example: 10
     * @bodyParam is_active boolean Example: false
     *
     * @response 200 {"success": true, "message": "SLA policy updated successfully.", "data": {"id": 1, "first_response_minutes": 10}}
     */
    public function update(UpdateSlaPolicyRequest $request, SlaPolicy $policy): JsonResponse
    {
        $policy->update($request->validated());

        return $this->success(new SlaPolicyResource($policy), 'SLA policy updated successfully.');
    }

    /**
     * Delete an SLA policy
     *
     * @response 200 {"success": true, "message": "SLA policy deleted successfully.", "data": null}
     */
    public function destroy(SlaPolicy $policy): JsonResponse
    {
        $this->authorize('delete', $policy);

        $policy->delete();

        return $this->deleted('SLA policy deleted successfully.');
    }
}
