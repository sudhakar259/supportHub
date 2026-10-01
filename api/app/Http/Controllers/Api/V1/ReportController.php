<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use App\Models\TicketStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @group Reports
 *
 * Aggregate reporting. These run live queries rather than against a
 * pre-aggregated table — acceptable at the data volumes a support
 * desk accumulates, but the first thing to revisit if that changes.
 */
class ReportController extends Controller
{
    /**
     * Ticket volume summary
     *
     * Open ticket counts grouped by status, priority and department.
     *
     * @response 200 {
     *   "success": true, "message": "Request successful.",
     *   "data": {
     *     "total_tickets": 142,
     *     "by_status": [{"status": "Open", "count": 12}],
     *     "by_priority": [{"priority": "High", "count": 8}],
     *     "by_department": [{"department": "Billing", "count": 20}]
     *   }
     * }
     */
    public function ticketSummary(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('reports.view'), 403, 'You do not have permission to perform this action.');

        $byStatus = Ticket::query()
            ->join('ticket_statuses', 'ticket_statuses.id', '=', 'tickets.status_id')
            ->groupBy('ticket_statuses.name')
            ->orderBy('ticket_statuses.sort_order')
            ->pluck(DB::raw('count(*) as count'), 'ticket_statuses.name')
            ->map(fn ($count, $status) => ['status' => $status, 'count' => $count])
            ->values();

        $byPriority = Ticket::query()
            ->join('ticket_priorities', 'ticket_priorities.id', '=', 'tickets.priority_id')
            ->groupBy('ticket_priorities.name')
            ->orderBy('ticket_priorities.level')
            ->pluck(DB::raw('count(*) as count'), 'ticket_priorities.name')
            ->map(fn ($count, $priority) => ['priority' => $priority, 'count' => $count])
            ->values();

        $byDepartment = Ticket::query()
            ->join('departments', 'departments.id', '=', 'tickets.department_id')
            ->groupBy('departments.name')
            ->pluck(DB::raw('count(*) as count'), 'departments.name')
            ->map(fn ($count, $department) => ['department' => $department, 'count' => $count])
            ->values();

        return $this->success([
            'total_tickets' => Ticket::count(),
            'by_status' => $byStatus,
            'by_priority' => $byPriority,
            'by_department' => $byDepartment,
        ]);
    }

    /**
     * SLA compliance report
     *
     * Breach rates for first response and resolution across all
     * tickets with a calculated SLA.
     *
     * @response 200 {
     *   "success": true, "message": "Request successful.",
     *   "data": {
     *     "total_with_sla": 100,
     *     "first_response_breached": 6,
     *     "resolution_breached": 11,
     *     "first_response_breach_rate": 6.0,
     *     "resolution_breach_rate": 11.0
     *   }
     * }
     */
    public function slaCompliance(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('reports.view'), 403, 'You do not have permission to perform this action.');

        $total = DB::table('ticket_slas')->count();
        $frBreached = DB::table('ticket_slas')->where('first_response_breached', true)->count();
        $resBreached = DB::table('ticket_slas')->where('resolution_breached', true)->count();

        return $this->success([
            'total_with_sla' => $total,
            'first_response_breached' => $frBreached,
            'resolution_breached' => $resBreached,
            'first_response_breach_rate' => $total ? round($frBreached / $total * 100, 1) : 0.0,
            'resolution_breach_rate' => $total ? round($resBreached / $total * 100, 1) : 0.0,
        ]);
    }

    /**
     * Agent performance report
     *
     * Resolved-ticket counts per agent, most active first.
     *
     * @response 200 {
     *   "success": true, "message": "Request successful.",
     *   "data": [{"agent_id": 5, "agent_name": "Alex Agent", "resolved_count": 34}]
     * }
     */
    public function agentPerformance(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('reports.view'), 403, 'You do not have permission to perform this action.');

        $resolvedStatusId = TicketStatus::where('slug', 'resolved')->value('id');

        $results = Ticket::query()
            ->join('users', 'users.id', '=', 'tickets.assignee_id')
            ->where('tickets.status_id', $resolvedStatusId)
            ->groupBy('users.id', 'users.name')
            ->orderByDesc(DB::raw('count(*)'))
            ->get([
                'users.id as agent_id',
                'users.name as agent_name',
                DB::raw('count(*) as resolved_count'),
            ]);

        return $this->success($results);
    }
}
