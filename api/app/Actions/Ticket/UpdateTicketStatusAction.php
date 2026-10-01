<?php

namespace App\Actions\Ticket;

use App\Events\TicketClosed;
use App\Events\TicketEscalated;
use App\Events\TicketReopened;
use App\Events\TicketResolved;
use App\Events\TicketStatusChanged;
use App\Exceptions\InvalidTicketStatusTransitionException;
use App\Models\Ticket;
use App\Models\TicketStatus;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\TicketActivityLogger;
use App\Services\TicketStatusWorkflow;
use Illuminate\Support\Facades\DB;

class UpdateTicketStatusAction
{
    public function __construct(
        private TicketStatusWorkflow $workflow,
        private TicketActivityLogger $activity,
        private AuditLogger $audit,
    ) {}

    public function execute(Ticket $ticket, string $toSlug, ?User $actor = null, ?string $reason = null): Ticket
    {
        $fromStatus = $ticket->status;
        $toStatus = TicketStatus::where('slug', $toSlug)->firstOrFail();

        if (! $this->workflow->canTransition($fromStatus->slug, $toStatus->slug)) {
            throw InvalidTicketStatusTransitionException::make($fromStatus->slug, $toStatus->slug);
        }

        $ticket = DB::transaction(function () use ($ticket, $fromStatus, $toStatus, $actor, $reason) {
            $ticket->statusHistory()->create([
                'from_status_id' => $fromStatus->id,
                'to_status_id' => $toStatus->id,
                'changed_by' => $actor?->id,
                'reason' => $reason,
            ]);

            $updates = ['status_id' => $toStatus->id];

            if ($toStatus->slug === TicketStatusWorkflow::RESOLVED) {
                $updates['resolved_at'] = now();
            }

            if ($toStatus->slug === TicketStatusWorkflow::CLOSED) {
                $updates['closed_at'] = now();
            }

            if ($toStatus->slug === TicketStatusWorkflow::REOPENED) {
                $updates['resolved_at'] = null;
                $updates['closed_at'] = null;
                $updates['reopened_count'] = $ticket->reopened_count + 1;
            }

            $ticket->forceFill($updates)->save();

            if ($toStatus->slug === TicketStatusWorkflow::RESOLVED && $ticket->sla) {
                $ticket->sla->update([
                    'resolved_met_at' => now(),
                    'resolution_breached' => now()->greaterThan($ticket->sla->resolution_due_at),
                    'status' => now()->greaterThan($ticket->sla->resolution_due_at) ? 'breached' : 'met',
                ]);
            }

            $this->activity->log(
                $ticket,
                'status_changed',
                "Status changed from {$fromStatus->name} to {$toStatus->name}".($reason ? ": {$reason}" : ''),
                $actor
            );

            $this->audit->log(
                'ticket.status_changed',
                $ticket,
                ['status_id' => $fromStatus->id],
                ['status_id' => $toStatus->id],
                $actor
            );

            return $ticket->fresh(['status', 'sla']);
        });

        event(new TicketStatusChanged($ticket, $fromStatus, $toStatus, $actor));

        match ($toStatus->slug) {
            TicketStatusWorkflow::ESCALATED => event(new TicketEscalated($ticket)),
            TicketStatusWorkflow::RESOLVED => event(new TicketResolved($ticket)),
            TicketStatusWorkflow::CLOSED => event(new TicketClosed($ticket)),
            TicketStatusWorkflow::REOPENED => event(new TicketReopened($ticket)),
            default => null,
        };

        return $ticket;
    }
}
