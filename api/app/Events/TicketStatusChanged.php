<?php

namespace App\Events;

use App\Models\Ticket;
use App\Models\TicketStatus;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TicketStatusChanged
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Ticket $ticket,
        public TicketStatus $fromStatus,
        public TicketStatus $toStatus,
        public ?User $actor,
    ) {}
}
