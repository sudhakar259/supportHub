<?php

namespace App\Listeners\Ticket;

use App\Actions\Ticket\SendTicketNotificationAction;
use App\Events\AgentReplied;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendAgentRepliedNotification implements ShouldQueue
{
    use BuildsTicketNotificationContext;

    public function __construct(private SendTicketNotificationAction $send) {}

    public function handle(AgentReplied $event): void
    {
        $this->inTenantOf($event->message->ticket->tenant, fn () => $this->notify($event));
    }

    private function notify(AgentReplied $event): void
    {
        $ticket = $event->message->ticket;

        $this->send->execute(
            'agent_replied',
            array_filter([$ticket->customer?->user]),
            $this->variables($ticket, $event->message->author),
            $this->ticketUrl($ticket)
        );
    }
}
