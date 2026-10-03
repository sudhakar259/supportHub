<?php

namespace App\Listeners\Webhook;

use App\Events\TicketCreated;
use App\Services\WebhookDispatcher;
use Illuminate\Contracts\Queue\ShouldQueue;

class DispatchTicketCreatedWebhook implements ShouldQueue
{
    use BuildsWebhookPayload;

    public function __construct(private WebhookDispatcher $dispatcher) {}

    public function handle(TicketCreated $event): void
    {
        $this->dispatcher->dispatch($event->ticket->tenant, 'ticket.created', $this->ticketPayload($event->ticket));
    }
}
