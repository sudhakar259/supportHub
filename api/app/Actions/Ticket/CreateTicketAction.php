<?php

namespace App\Actions\Ticket;

use App\Enums\TicketAssignmentType;
use App\Events\TicketCreated;
use App\Models\Customer;
use App\Models\Ticket;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\TicketActivityLogger;
use App\Services\TicketStatusWorkflow;
use Illuminate\Support\Facades\DB;

/**
 * Orchestrates the full ticket-creation pipeline described in section 11
 * of the spec: create -> evaluate routing -> determine department ->
 * determine agent -> create assignment -> calculate SLA -> (caller
 * dispatches notifications via the TicketCreated event, queued).
 *
 * Routing, assignment and SLA calculation run synchronously (not via
 * queued listeners) so the ticket returned to the API caller already
 * reflects its final department/assignee/SLA — only notification
 * delivery is deferred to the queue.
 */
class CreateTicketAction
{
    public function __construct(
        private GenerateTicketNumberAction $generateNumber,
        private ApplyTicketRoutingAction $applyRouting,
        private AutoAssignAgentAction $autoAssignAgent,
        private AssignTicketAction $assignTicket,
        private CalculateSlaAction $calculateSla,
        private TicketActivityLogger $activity,
        private AuditLogger $audit,
        private SendTicketNotificationAction $sendNotification,
    ) {}

    public function execute(Customer $customer, array $data, ?User $actor = null): Ticket
    {
        $notifyTemplateKeys = [];

        // The event (and its queued notification listener) is dispatched
        // after the transaction commits, not inside it — a queue worker
        // could otherwise pick the job up before the ticket row is
        // actually visible to other connections.
        $ticket = DB::transaction(function () use ($customer, $data, $actor, &$notifyTemplateKeys) {
            $status = TicketStatus::where('slug', TicketStatusWorkflow::OPEN)->firstOrFail();
            $priority = isset($data['priority_id'])
                ? TicketPriority::findOrFail($data['priority_id'])
                : TicketPriority::default();

            $ticket = new Ticket([
                'customer_id' => $customer->id,
                'subject' => $data['subject'],
                'description' => $data['description'],
                'category_id' => $data['category_id'] ?? null,
                'priority_id' => $priority->id,
                'status_id' => $status->id,
                'department_id' => $data['department_id'] ?? null,
            ]);

            $routingOutcome = $this->applyRouting->execute($ticket);
            $notifyTemplateKeys = $routingOutcome['notify_template_keys'];

            if ($routingOutcome['escalate']) {
                $ticket->status_id = TicketStatus::where('slug', TicketStatusWorkflow::ESCALATED)->value('id') ?? $ticket->status_id;
            }

            $ticket->ticket_number = $this->generateNumber->execute($ticket->department_id);
            $ticket->save();

            $this->activity->log($ticket, 'created', "Ticket created by {$customer->user->name}", null);
            $this->audit->log('ticket.created', $ticket, null, $ticket->toArray(), $actor);

            if ($ticket->department_id) {
                $assignee = null;

                if ($routingOutcome['assignee_id']) {
                    $assignee = User::find($routingOutcome['assignee_id']);
                }

                $assignee ??= $this->autoAssignAgent->execute($ticket->department->fresh());

                if ($assignee) {
                    $this->assignTicket->execute($ticket, $assignee, $ticket->department_id, TicketAssignmentType::Automatic);
                }
            }

            $this->calculateSla->execute($ticket);

            return $ticket->fresh(['customer.user', 'category', 'priority', 'status', 'department', 'assignee', 'sla']);
        });

        event(new TicketCreated($ticket));

        foreach ($notifyTemplateKeys as $templateKey) {
            $this->sendNotification->execute($templateKey, [$ticket->customer->user], [
                'ticket_number' => $ticket->ticket_number,
                'customer_name' => $ticket->customer->user->name,
                'ticket_subject' => $ticket->subject,
            ], \App\Support\WorkspaceDomains::url($ticket->tenant, "/tickets/{$ticket->id}"));
        }

        return $ticket;
    }
}
