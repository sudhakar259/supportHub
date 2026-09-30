<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Priority\StorePriorityRequest;
use App\Http\Requests\Priority\UpdatePriorityRequest;
use App\Http\Resources\TicketPriorityResource;
use App\Models\TicketPriority;
use Illuminate\Http\JsonResponse;

/**
 * @group Priorities
 *
 * Ticket priorities. `level` is a numeric ordering used by routing
 * rules and reporting (higher = more urgent).
 */
class TicketPriorityController extends Controller
{
    /**
     * List priorities
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "name": "Low", "level": 1}]}
     */
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', TicketPriority::class);

        $priorities = TicketPriority::orderBy('level')->get();

        return $this->success(TicketPriorityResource::collection($priorities));
    }

    /**
     * Create a priority
     *
     * @bodyParam name string required Example: Critical
     * @bodyParam slug string required Example: critical
     * @bodyParam level integer required Higher means more urgent. Example: 5
     * @bodyParam color string Hex color. Example: #DC2626
     *
     * @response 201 {"success": true, "message": "Priority created successfully.", "data": {"id": 5, "name": "Critical"}}
     */
    public function store(StorePriorityRequest $request): JsonResponse
    {
        $priority = TicketPriority::create($request->validated());

        return $this->created(new TicketPriorityResource($priority), 'Priority created successfully.');
    }

    /**
     * Get a priority
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": 1, "name": "Low"}}
     */
    public function show(TicketPriority $priority): JsonResponse
    {
        $this->authorize('view', $priority);

        return $this->success(new TicketPriorityResource($priority));
    }

    /**
     * Update a priority
     *
     * @bodyParam name string Example: Critical
     * @bodyParam level integer Example: 5
     *
     * @response 200 {"success": true, "message": "Priority updated successfully.", "data": {"id": 5, "name": "Critical"}}
     */
    public function update(UpdatePriorityRequest $request, TicketPriority $priority): JsonResponse
    {
        $priority->update($request->validated());

        return $this->success(new TicketPriorityResource($priority), 'Priority updated successfully.');
    }

    /**
     * Delete a priority
     *
     * Refuses to delete a priority that is currently in use by any ticket.
     *
     * @response 200 {"success": true, "message": "Priority deleted successfully.", "data": null}
     * @response 422 {"success": false, "message": "This priority is in use by existing tickets and cannot be deleted."}
     */
    public function destroy(TicketPriority $priority): JsonResponse
    {
        $this->authorize('delete', $priority);

        if ($priority->tickets()->exists()) {
            return $this->error('This priority is in use by existing tickets and cannot be deleted.', 422);
        }

        $priority->delete();

        return $this->deleted('Priority deleted successfully.');
    }
}
