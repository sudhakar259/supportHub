<?php

namespace App\Listeners\Webhook;

use App\Events\TicketAssigned;
use App\Services\WebhookDispatcher;
use Illuminate\Contracts\Queue\ShouldQueue;

class DispatchTicketAssignedWebhook implements ShouldQueue
{
    use BuildsWebhookPayload;

    public function __construct(private WebhookDispatcher $dispatcher) {}

    public function handle(TicketAssigned $event): void
    {
        $payload = $this->ticketPayload($event->ticket) + ['assignment_type' => $event->assignment->assignment_type->value];

        $this->dispatcher->dispatch($event->ticket->tenant, 'ticket.assigned', $payload);
    }
}
