<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * @group Audit Logs
 *
 * System-wide, read-only audit trail. Distinct from a ticket's own
 * activity feed (GET /tickets/{ticket}/activities) — this covers every
 * auditable action across the whole application for compliance review:
 * login, ticket create/assign/status-change, customer/user creation,
 * role changes, API credential and webhook lifecycle events, and
 * platform-admin tenant actions. There is currently no billing-change
 * endpoint for a platform admin to alter an existing tenant's
 * subscription/plan, so that action from section 42 has nothing to log
 * yet.
 */
class AuditLogController extends Controller
{
    /**
     * List audit log entries
     *
     * @queryParam filter[action] Exact action name. Example: ticket.status_changed
     * @queryParam filter[actor_id] Example: 2
     * @queryParam filter[auditable_type] Exact model class, e.g. App\\Models\\Ticket.
     * @queryParam sort Sort by created_at. Example: -created_at
     * @queryParam per_page Items per page (max 100). Example: 25
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "action": "ticket.created"}]}
     */
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('audit-logs.view'), 403, 'You do not have permission to perform this action.');

        $logs = QueryBuilder::for(AuditLog::class)
            ->allowedFilters(
                AllowedFilter::exact('action'),
                AllowedFilter::exact('actor_id'),
                AllowedFilter::exact('auditable_type'),
            )
            ->allowedSorts('created_at')
            ->with('actor')
            ->defaultSort('-created_at')
            ->paginate(min((int) $request->integer('per_page', 25), 100));

        return $this->success(AuditLogResource::collection($logs));
    }
}
