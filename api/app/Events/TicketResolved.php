<?php

namespace App\Events;

use App\Models\Ticket;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TicketResolved
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Ticket $ticket) {}
}
