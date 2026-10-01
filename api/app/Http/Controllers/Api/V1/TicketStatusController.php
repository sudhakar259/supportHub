<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Status\StoreStatusRequest;
use App\Http\Requests\Status\UpdateStatusRequest;
use App\Http\Resources\TicketStatusResource;
use App\Models\TicketStatus;
use App\Services\TicketStatusWorkflow;
use Illuminate\Http\JsonResponse;

/**
 * @group Statuses
 *
 * The seven built-in statuses (Open, In Progress, Pending, Escalated,
 * Resolved, Closed, Reopened) drive the ticket status workflow (see
 * docs/ticket-workflow.md) and are matched by slug, not id — additional
 * statuses can be added here for labeling/reporting but will not
 * automatically participate in transition validation.
 */
class TicketStatusController extends Controller
{
    /**
     * List statuses
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "name": "Open", "slug": "open"}]}
     */
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', TicketStatus::class);

        $statuses = TicketStatus::orderBy('sort_order')->get();

        return $this->success(TicketStatusResource::collection($statuses));
    }

    /**
     * Create a status
     *
     * @bodyParam name string required Example: On Hold
     * @bodyParam slug string required Unique, used internally. Example: on-hold
     * @bodyParam color string Hex color. Example: #6B7280
     * @bodyParam is_closed boolean Whether this status counts as a terminal/closed state. Example: false
     *
     * @response 201 {"success": true, "message": "Status created successfully.", "data": {"id": 8, "name": "On Hold"}}
     */
    public function store(StoreStatusRequest $request): JsonResponse
    {
        $status = TicketStatus::create($request->validated());

        return $this->created(new TicketStatusResource($status), 'Status created successfully.');
    }

    /**
     * Get a status
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": 1, "name": "Open"}}
     */
    public function show(TicketStatus $status): JsonResponse
    {
        $this->authorize('view', $status);

        return $this->success(new TicketStatusResource($status));
    }

    /**
     * Update a status
     *
     * @bodyParam name string Example: On Hold
     * @bodyParam color string Example: #F59E0B
     *
     * @response 200 {"success": true, "message": "Status updated successfully.", "data": {"id": 8, "name": "On Hold"}}
     */
    public function update(UpdateStatusRequest $request, TicketStatus $status): JsonResponse
    {
        $status->update($request->validated());

        return $this->success(new TicketStatusResource($status), 'Status updated successfully.');
    }

    /**
     * Delete a status
     *
     * Refuses to delete a status that is currently in use by any ticket.
     *
     * @response 200 {"success": true, "message": "Status deleted successfully.", "data": null}
     * @response 422 {"success": false, "message": "This status is in use by existing tickets and cannot be deleted."}
     */
    public function destroy(TicketStatus $status): JsonResponse
    {
        $this->authorize('delete', $status);

        // The 7 workflow slugs are looked up by name throughout
        // TicketStatusWorkflow and the *TicketAction classes, independent of
        // whether any ticket currently sits in that status. The in-use
        // check below only protects a status that's *currently* referenced
        // — it would happily let someone delete e.g. "escalated" while it
        // happens to be empty, breaking POST /tickets/{id}/escalate for
        // every ticket, system-wide, until it's re-seeded.
        if (in_array($status->slug, array_keys(TicketStatusWorkflow::TRANSITIONS), true)) {
            return $this->error('This status is a reserved workflow status and cannot be deleted.', 422);
        }

        if ($status->tickets()->exists()) {
            return $this->error('This status is in use by existing tickets and cannot be deleted.', 422);
        }

        $status->delete();

        return $this->deleted('Status deleted successfully.');
    }
}
