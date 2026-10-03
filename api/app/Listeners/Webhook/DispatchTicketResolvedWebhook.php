<?php

namespace App\Listeners\Webhook;

use App\Events\TicketResolved;
use App\Services\WebhookDispatcher;
use Illuminate\Contracts\Queue\ShouldQueue;

class DispatchTicketResolvedWebhook implements ShouldQueue
{
    use BuildsWebhookPayload;

    public function __construct(private WebhookDispatcher $dispatcher) {}

    public function handle(TicketResolved $event): void
    {
        $this->dispatcher->dispatch($event->ticket->tenant, 'ticket.resolved', $this->ticketPayload($event->ticket));
    }
}
