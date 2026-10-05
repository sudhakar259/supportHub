<?php

namespace App\Listeners\Ticket;

use App\Actions\Ticket\SendTicketNotificationAction;
use App\Events\TicketEscalated;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendTicketEscalatedNotification implements ShouldQueue
{
    use BuildsTicketNotificationContext;

    public function __construct(private SendTicketNotificationAction $send) {}

    public function handle(TicketEscalated $event): void
    {
        $this->inTenantOf($event->ticket->tenant, fn () => $this->notify($event));
    }

    private function notify(TicketEscalated $event): void
    {
        $ticket = $event->ticket;
        $recipients = $this->departmentManagersAndSeniorAgents($ticket);

        if ($ticket->assignee) {
            $recipients[] = $ticket->assignee;
        }

        $this->send->execute('ticket_escalated', $recipients, $this->variables($ticket), $this->ticketUrl($ticket));
    }
}
