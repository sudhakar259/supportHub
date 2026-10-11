<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Ticket\AssignTicketAction;
use App\Actions\Ticket\CalculateSlaAction;
use App\Actions\Ticket\CloseTicketAction;
use App\Actions\Ticket\CreateTicketAction;
use App\Actions\Ticket\EscalateTicketAction;
use App\Actions\Ticket\ReopenTicketAction;
use App\Actions\Ticket\ResolveTicketAction;
use App\Enums\TicketAssignmentType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ticket\AssignTicketRequest;
use App\Http\Requests\Ticket\StoreTicketRequest;
use App\Http\Requests\Ticket\TicketStatusReasonRequest;
use App\Http\Requests\Ticket\UpdateTicketRequest;
use App\Http\Resources\TicketActivityResource;
use App\Http\Resources\TicketResource;
use App\Models\Customer;
use App\Models\Ticket;
use App\Models\User;
use App\Services\PlanLimitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * @group Tickets
 *
 * The core ticket resource. Visibility is scoped automatically: a
 * customer only ever sees their own tickets; non-administrator staff
 * only see tickets in their department(s) or assigned directly to
 * them. Administrators see everything.
 */
class TicketController extends Controller
{
    public function __construct(
        private CreateTicketAction $createTicket,
        private AssignTicketAction $assignTicket,
        private EscalateTicketAction $escalateTicket,
        private ResolveTicketAction $resolveTicket,
        private CloseTicketAction $closeTicket,
        private ReopenTicketAction $reopenTicket,
        private CalculateSlaAction $calculateSla,
    ) {}

    /**
     * List tickets
     *
     * @queryParam filter[status_id] Example: 1
     * @queryParam filter[priority_id] Example: 2
     * @queryParam filter[department_id] Example: 1
     * @queryParam filter[assignee_id] Example: 5
     * @queryParam filter[customer_id] Example: 3
     * @queryParam filter[ticket_number] Partial match. Example: TKT-2026
     * @queryParam filter[search] Matches subject or description. Example: login issue
     * @queryParam filter[sla_status] One of pending, met, breached (ticket_slas.status is never set to any other value). Example: breached
     * @queryParam sort Sort by created_at, updated_at or priority. Prefix with - for descending. Example: -created_at
     * @queryParam per_page Items per page (max 100). Example: 25
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": "01HXYZ...", "ticket_number": "TKT-2026-000125"}]}
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Ticket::class);

        $query = Ticket::query();
        $this->scopeToAccessibleTickets($query, $request->user());

        $tickets = QueryBuilder::for($query)
            ->allowedFilters(
                AllowedFilter::exact('status_id'),
                AllowedFilter::exact('priority_id'),
                AllowedFilter::exact('department_id'),
                AllowedFilter::exact('assignee_id'),
                AllowedFilter::exact('customer_id'),
                AllowedFilter::partial('ticket_number'),
                AllowedFilter::callback('tag', fn ($query, $value) => $query->whereHas('tags', fn ($q) => $q->where('slug', $value))),
                AllowedFilter::callback('search', function ($query, $value) {
                    $query->where(fn ($q) => $q->where('subject', 'like', "%{$value}%")->orWhere('description', 'like', "%{$value}%"));
                }),
                AllowedFilter::callback('sla_status', fn ($query, $value) => $query->whereHas('sla', fn ($q) => $q->where('status', $value))),
            )
            ->allowedSorts('created_at', 'updated_at', 'priority_id')
            ->with(['customer.user', 'category', 'priority', 'status', 'department', 'assignee', 'tags'])
            ->defaultSort('-created_at')
            ->paginate(min((int) $request->integer('per_page', 25), 100));

        return $this->success(TicketResource::collection($tickets));
    }

    /**
     * Create a ticket
     *
     * Runs the full creation pipeline: routing rule evaluation,
     * department/agent assignment, and SLA calculation, before
     * queuing the "ticket created" notification.
     *
     * @bodyParam subject string required Example: Unable to login
     * @bodyParam description string required Example: I get an error when trying to log in with my email.
     * @bodyParam category_id integer Example: 1
     * @bodyParam priority_id integer Defaults to the system default priority. Example: 2
     * @bodyParam customer_id integer Staff only — create on behalf of this customer. Example: 3
     *
     * @response 201 {"success": true, "message": "Ticket created successfully.", "data": {"id": "01HXYZ...", "ticket_number": "TKT-2026-000125"}}
     */
    public function store(StoreTicketRequest $request): JsonResponse
    {
        $customer = $this->resolveActingCustomer($request);

        app(PlanLimitService::class)->assertCanCreate($request->user()->tenant, 'tickets_per_month');

        $ticket = $this->createTicket->execute($customer, $request->validated(), $request->user());

        return $this->created(new TicketResource($ticket), 'Ticket created successfully.');
    }

    /**
     * Get a ticket
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": "01HXYZ...", "ticket_number": "TKT-2026-000125"}}
     * @response 403 {"success": false, "message": "You do not have permission to perform this action."}
     */
    public function show(Ticket $ticket): JsonResponse
    {
        $this->authorize('view', $ticket);

        $ticket->load([
            'customer.user', 'category', 'priority', 'status', 'department', 'assignee', 'sla', 'tags',
            'attachments' => fn ($q) => $q->whereNull('ticket_message_id'),
        ]);

        return $this->success(new TicketResource($ticket));
    }

    /**
     * Update a ticket
     *
     * Customers may edit their own ticket's subject/description/category
     * while it is still open; priority may only be changed by staff.
     *
     * @bodyParam subject string Example: Unable to login (updated)
     * @bodyParam description string Example: Updated description.
     * @bodyParam category_id integer Example: 2
     * @bodyParam priority_id integer Staff only. Example: 3
     *
     * @response 200 {"success": true, "message": "Ticket updated successfully.", "data": {"id": "01HXYZ...", "subject": "Unable to login (updated)"}}
     */
    public function update(UpdateTicketRequest $request, Ticket $ticket): JsonResponse
    {
        $data = $request->validated();

        if ($request->user()->isCustomer()) {
            unset($data['priority_id']);
        }

        $priorityChanged = array_key_exists('priority_id', $data) && $data['priority_id'] !== $ticket->priority_id;

        $ticket->update($data);

        // SLA due dates were previously only ever calculated once, at
        // creation, and pinned to the priority at that moment — a ticket
        // re-prioritized to a tighter SLA kept its original, looser due
        // dates with no indication anything was stale. Recalculate
        // whenever priority actually changes (not on every update, so an
        // already-replied-to / already-resolved SLA's met/breached history
        // isn't disturbed by an unrelated subject/description edit).
        if ($priorityChanged) {
            $this->calculateSla->execute($ticket);
        }

        return $this->success(new TicketResource($ticket->fresh(['category', 'priority', 'sla'])), 'Ticket updated successfully.');
    }

    /**
     * Delete a ticket
     *
     * Soft-deletes the ticket. Administrator only.
     *
     * @response 200 {"success": true, "message": "Ticket deleted successfully.", "data": null}
     */
    public function destroy(Ticket $ticket): JsonResponse
    {
        $this->authorize('delete', $ticket);

        $ticket->delete();

        return $this->deleted('Ticket deleted successfully.');
    }

    /**
     * Assign a ticket
     *
     * Manually assigns (or reassigns) the ticket to an agent. Creates a
     * new entry in the assignment history; the previous assignment, if
     * any, is preserved with its unassigned_at timestamp set.
     *
     * @bodyParam assignee_id integer required Example: 5
     * @bodyParam department_id integer Defaults to the ticket's current department. Example: 2
     * @bodyParam note string Example: Reassigning — original agent is OOO.
     *
     * @response 200 {"success": true, "message": "Ticket assigned successfully.", "data": {"id": "01HXYZ...", "assignee": {"id": 5}}}
     */
    public function assign(AssignTicketRequest $request, Ticket $ticket): JsonResponse
    {
        $assignee = User::findOrFail($request->input('assignee_id'));
        $type = $ticket->assignee_id ? TicketAssignmentType::Reassignment : TicketAssignmentType::Manual;

        $this->assignTicket->execute(
            $ticket,
            $assignee,
            $request->integer('department_id') ?: null,
            $type,
            $request->user(),
            $request->input('note')
        );

        return $this->success(new TicketResource($ticket->fresh(['assignee', 'department'])), 'Ticket assigned successfully.');
    }

    /**
     * Escalate a ticket
     *
     * @bodyParam reason string Example: Customer is a VIP and SLA is at risk.
     *
     * @response 200 {"success": true, "message": "Ticket escalated successfully.", "data": {"id": "01HXYZ...", "status": {"slug": "escalated"}}}
     * @response 422 {"success": false, "message": "Cannot transition a ticket from \"closed\" to \"escalated\"."}
     */
    public function escalate(TicketStatusReasonRequest $request, Ticket $ticket): JsonResponse
    {
        $this->authorize('escalate', $ticket);

        $ticket = $this->escalateTicket->execute($ticket, $request->user(), $request->input('reason'));

        return $this->success(new TicketResource($ticket->load('status')), 'Ticket escalated successfully.');
    }

    /**
     * Resolve a ticket
     *
     * @bodyParam reason string Example: Issue fixed by clearing the user's session cache.
     *
     * @response 200 {"success": true, "message": "Ticket resolved successfully.", "data": {"id": "01HXYZ...", "status": {"slug": "resolved"}}}
     */
    public function resolve(TicketStatusReasonRequest $request, Ticket $ticket): JsonResponse
    {
        $this->authorize('resolve', $ticket);

        $ticket = $this->resolveTicket->execute($ticket, $request->user(), $request->input('reason'));

        return $this->success(new TicketResource($ticket->load('status')), 'Ticket resolved successfully.');
    }

    /**
     * Close a ticket
     *
     * @bodyParam reason string Example: Customer confirmed resolution.
     *
     * @response 200 {"success": true, "message": "Ticket closed successfully.", "data": {"id": "01HXYZ...", "status": {"slug": "closed"}}}
     */
    public function close(TicketStatusReasonRequest $request, Ticket $ticket): JsonResponse
    {
        $this->authorize('close', $ticket);

        $ticket = $this->closeTicket->execute($ticket, $request->user(), $request->input('reason'));

        return $this->success(new TicketResource($ticket->load('status')), 'Ticket closed successfully.');
    }

    /**
     * Reopen a ticket
     *
     * Available to the owning customer or staff with tickets.reopen,
     * from a Closed or Resolved state.
     *
     * @bodyParam reason string Example: The issue came back.
     *
     * @response 200 {"success": true, "message": "Ticket reopened successfully.", "data": {"id": "01HXYZ...", "status": {"slug": "reopened"}}}
     */
    public function reopen(TicketStatusReasonRequest $request, Ticket $ticket): JsonResponse
    {
        $this->authorize('reopen', $ticket);

        $ticket = $this->reopenTicket->execute($ticket, $request->user(), $request->input('reason'));

        return $this->success(new TicketResource($ticket->load('status')), 'Ticket reopened successfully.');
    }

    /**
     * Get a ticket's activity feed
     *
     * The chronological system log of everything that happened to this
     * ticket (created, assigned, status changes, messages posted) —
     * distinct from the audit log, which only covers a narrow set of
     * compliance-relevant actions across the whole application.
     *
     * @urlParam ticket string required Example: 01hxyz0123456789abcdefghj
     *
     * @queryParam per_page Items per page (max 100). Example: 25
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": "01HXYZ...", "type": "created", "description": "Ticket created by Casey Customer"}]}
     */
    public function activities(Request $request, Ticket $ticket): JsonResponse
    {
        $this->authorize('view', $ticket);

        $activities = $ticket->activities()
            ->with('actor')
            ->orderByDesc('created_at')
            ->paginate(min((int) $request->integer('per_page', 25), 100));

        return $this->success(TicketActivityResource::collection($activities));
    }

    private function resolveActingCustomer(Request $request): Customer
    {
        $user = $request->user();

        if ($user->isCustomer()) {
            return $user->customer()->firstOrFail();
        }

        return Customer::findOrFail($request->input('customer_id'));
    }

    private function scopeToAccessibleTickets($query, User $user): void
    {
        $query->accessibleTo($user);
    }
}
