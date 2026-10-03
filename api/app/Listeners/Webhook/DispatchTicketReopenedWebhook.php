<?php

namespace App\Listeners\Webhook;

use App\Events\TicketReopened;
use App\Services\WebhookDispatcher;
use Illuminate\Contracts\Queue\ShouldQueue;

class DispatchTicketReopenedWebhook implements ShouldQueue
{
    use BuildsWebhookPayload;

    public function __construct(private WebhookDispatcher $dispatcher) {}

    public function handle(TicketReopened $event): void
    {
        $this->dispatcher->dispatch($event->ticket->tenant, 'ticket.reopened', $this->ticketPayload($event->ticket));
    }
}
