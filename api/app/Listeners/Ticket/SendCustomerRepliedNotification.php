<?php

namespace App\Listeners\Ticket;

use App\Actions\Ticket\SendTicketNotificationAction;
use App\Events\CustomerReplied;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendCustomerRepliedNotification implements ShouldQueue
{
    use BuildsTicketNotificationContext;

    public function __construct(private SendTicketNotificationAction $send) {}

    public function handle(CustomerReplied $event): void
    {
        $ticket = $event->message->ticket;
        $recipients = $ticket->assignee ? [$ticket->assignee] : $this->departmentManagersAndSeniorAgents($ticket);

        $this->send->execute('customer_replied', $recipients, $this->variables($ticket), $this->ticketUrl($ticket));
    }
}
