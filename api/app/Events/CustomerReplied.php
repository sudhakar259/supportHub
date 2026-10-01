<?php

namespace App\Events;

use App\Models\TicketMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CustomerReplied
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public TicketMessage $message) {}
}
