<?php

namespace App\Listeners\Ticket;

use App\Actions\Ticket\SendTicketNotificationAction;
use App\Events\TicketResolved;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendTicketResolvedNotification implements ShouldQueue
{
    use BuildsTicketNotificationContext;

    public function __construct(private SendTicketNotificationAction $send) {}

    public function handle(TicketResolved $event): void
    {
        $ticket = $event->ticket;

        $this->send->execute(
            'ticket_resolved',
            array_filter([$ticket->customer?->user]),
            $this->variables($ticket),
            $this->ticketUrl($ticket)
        );
    }
}
