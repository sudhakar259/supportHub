<?php

namespace App\Actions\Ticket;

use App\Enums\TicketAssignmentType;
use App\Events\TicketAssigned;
use App\Models\Ticket;
use App\Models\TicketAssignment;
use App\Models\User;
use App\Services\TicketActivityLogger;
use Illuminate\Support\Facades\DB;

/**
 * Creates a new assignment record without ever mutating a previous one
 * (append-only history — see ticket_assignments migration). The
 * previous "current" assignment, if any, is stamped with
 * unassigned_at rather than deleted or overwritten.
 */
class AssignTicketAction
{
    public function __construct(private TicketActivityLogger $activity) {}

    public function execute(
        Ticket $ticket,
        ?User $assignee,
        ?int $departmentId,
        TicketAssignmentType $type,
        ?User $actor = null,
        ?string $note = null,
    ): TicketAssignment {
        return DB::transaction(function () use ($ticket, $assignee, $departmentId, $type, $actor, $note) {
            $previousAssigneeId = $ticket->assignee_id;

            $ticket->assignments()
                ->whereNull('unassigned_at')
                ->update(['unassigned_at' => now()]);

            $assignment = $ticket->assignments()->create([
                'department_id' => $departmentId ?? $ticket->department_id,
                'assignee_id' => $assignee?->id,
                'previous_assignee_id' => $previousAssigneeId,
                'assigned_by' => $actor?->id,
                'assignment_type' => $type,
                'note' => $note,
                'assigned_at' => now(),
            ]);

            $ticket->forceFill([
                'assignee_id' => $assignee?->id,
                'department_id' => $departmentId ?? $ticket->department_id,
            ])->save();

            $this->activity->log(
                $ticket,
                'assigned',
                $assignee ? "Assigned to {$assignee->name}" : 'Unassigned',
                $actor,
                ['assignment_type' => $type->value, 'assignee_id' => $assignee?->id]
            );

            event(new TicketAssigned($ticket->fresh(), $assignment));

            return $assignment;
        });
    }
}
