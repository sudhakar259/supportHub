<?php

namespace App\Actions\Ticket;

use App\Models\Ticket;
use App\Models\User;
use App\Services\TicketStatusWorkflow;

class EscalateTicketAction
{
    public function __construct(private UpdateTicketStatusAction $updateStatus) {}

    public function execute(Ticket $ticket, ?User $actor = null, ?string $reason = null): Ticket
    {
        return $this->updateStatus->execute($ticket, TicketStatusWorkflow::ESCALATED, $actor, $reason);
    }
}
