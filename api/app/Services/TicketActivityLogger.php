<?php

namespace App\Services;

use App\Models\Ticket;
use App\Models\TicketActivity;
use App\Models\User;

class TicketActivityLogger
{
    public function log(Ticket $ticket, string $type, string $description, ?User $actor = null, array $meta = []): TicketActivity
    {
        return $ticket->activities()->create([
            'actor_id' => $actor?->id,
            'type' => $type,
            'description' => $description,
            'meta' => $meta ?: null,
        ]);
    }
}
