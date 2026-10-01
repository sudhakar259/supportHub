<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Routing\StoreRoutingRuleRequest;
use App\Http\Requests\Routing\UpdateRoutingRuleRequest;
use App\Http\Resources\TicketRoutingRuleResource;
use App\Models\TicketRoutingRule;
use Illuminate\Http\JsonResponse;

/**
 * @group Routing
 *
 * Ticket routing rules, evaluated in `priority` order (lowest first)
 * against every newly-created ticket. See docs/routing.md for the full
 * condition/action schema and worked examples.
 */
class TicketRoutingRuleController extends Controller
{
    /**
     * List routing rules
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "name": "Route billing keywords"}]}
     */
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', TicketRoutingRule::class);

        $rules = TicketRoutingRule::orderBy('priority')->get();

        return $this->success(TicketRoutingRuleResource::collection($rules));
    }

    /**
     * Create a routing rule
     *
     * @bodyParam name string required Example: Route billing category to Billing dept
     * @bodyParam priority integer Lower runs first. Defaults to 0. Example: 10
     * @bodyParam is_active boolean Defaults to true. Example: true
     * @bodyParam stop_processing boolean Stop evaluating further rules once this one matches. Example: true
     * @bodyParam conditions object[] required AND-combined. Example: [{"field": "category_id", "operator": "=", "value": 3}]
     * @bodyParam actions object[] required Example: [{"type": "assign_department", "value": 2}]
     *
     * @response 201 {"success": true, "message": "Routing rule created successfully.", "data": {"id": 3, "name": "Route billing category to Billing dept"}}
     */
    public function store(StoreRoutingRuleRequest $request): JsonResponse
    {
        $rule = TicketRoutingRule::create($request->validated());

        return $this->created(new TicketRoutingRuleResource($rule), 'Routing rule created successfully.');
    }

    /**
     * Get a routing rule
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": 1, "name": "Route billing keywords"}}
     */
    public function show(TicketRoutingRule $rule): JsonResponse
    {
        $this->authorize('view', $rule);

        return $this->success(new TicketRoutingRuleResource($rule));
    }

    /**
     * Update a routing rule
     *
     * @bodyParam is_active boolean Example: false
     * @bodyParam priority integer Example: 5
     *
     * @response 200 {"success": true, "message": "Routing rule updated successfully.", "data": {"id": 1, "is_active": false}}
     */
    public function update(UpdateRoutingRuleRequest $request, TicketRoutingRule $rule): JsonResponse
    {
        $rule->update($request->validated());

        return $this->success(new TicketRoutingRuleResource($rule), 'Routing rule updated successfully.');
    }

    /**
     * Delete a routing rule
     *
     * @response 200 {"success": true, "message": "Routing rule deleted successfully.", "data": null}
     */
    public function destroy(TicketRoutingRule $rule): JsonResponse
    {
        $this->authorize('delete', $rule);

        $rule->delete();

        return $this->deleted('Routing rule deleted successfully.');
    }
}
