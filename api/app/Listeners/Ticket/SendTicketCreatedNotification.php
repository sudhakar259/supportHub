<?php

namespace App\Listeners\Ticket;

use App\Actions\Ticket\SendTicketNotificationAction;
use App\Events\TicketCreated;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendTicketCreatedNotification implements ShouldQueue
{
    use BuildsTicketNotificationContext;

    public function __construct(private SendTicketNotificationAction $send) {}

    public function handle(TicketCreated $event): void
    {
        $ticket = $event->ticket;

        // Assignment (if any) happened synchronously during creation and
        // already fired its own TicketAssigned event — that listener
        // handles notifying the assignee, so this only covers the customer.
        $this->send->execute(
            'ticket_created',
            array_filter([$ticket->customer?->user]),
            $this->variables($ticket),
            $this->ticketUrl($ticket)
        );
    }
}
