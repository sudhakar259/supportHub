<?php

namespace App\Listeners\Ticket;

use App\Actions\Ticket\SendTicketNotificationAction;
use App\Events\TicketAssigned;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendTicketAssignedNotification implements ShouldQueue
{
    use BuildsTicketNotificationContext;

    public function __construct(private SendTicketNotificationAction $send) {}

    public function handle(TicketAssigned $event): void
    {
        if (! $event->assignment->assignee_id) {
            return;
        }

        $this->send->execute(
            'ticket_assigned',
            [$event->assignment->assignee],
            $this->variables($event->ticket, $event->assignment->assignee),
            $this->ticketUrl($event->ticket)
        );
    }
}
