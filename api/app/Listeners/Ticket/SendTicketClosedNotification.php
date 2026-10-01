<?php

namespace App\Listeners\Ticket;

use App\Actions\Ticket\SendTicketNotificationAction;
use App\Events\TicketClosed;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendTicketClosedNotification implements ShouldQueue
{
    use BuildsTicketNotificationContext;

    public function __construct(private SendTicketNotificationAction $send) {}

    public function handle(TicketClosed $event): void
    {
        $ticket = $event->ticket;

        $this->send->execute(
            'ticket_closed',
            array_filter([$ticket->customer?->user]),
            $this->variables($ticket),
            $this->ticketUrl($ticket)
        );
    }
}
