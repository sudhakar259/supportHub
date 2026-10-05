<?php

namespace App\Listeners\Ticket;

use App\Actions\Ticket\SendTicketNotificationAction;
use App\Events\TicketReopened;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendTicketReopenedNotification implements ShouldQueue
{
    use BuildsTicketNotificationContext;

    public function __construct(private SendTicketNotificationAction $send) {}

    public function handle(TicketReopened $event): void
    {
        $this->inTenantOf($event->ticket->tenant, fn () => $this->notify($event));
    }

    private function notify(TicketReopened $event): void
    {
        $ticket = $event->ticket;
        $recipients = $ticket->assignee ? [$ticket->assignee] : $this->departmentManagersAndSeniorAgents($ticket);

        $this->send->execute('ticket_reopened', $recipients, $this->variables($ticket), $this->ticketUrl($ticket));
    }
}
