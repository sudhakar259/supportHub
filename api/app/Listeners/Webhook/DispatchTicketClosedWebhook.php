<?php

namespace App\Listeners\Webhook;

use App\Events\TicketClosed;
use App\Services\WebhookDispatcher;
use Illuminate\Contracts\Queue\ShouldQueue;

class DispatchTicketClosedWebhook implements ShouldQueue
{
    use BuildsWebhookPayload;

    public function __construct(private WebhookDispatcher $dispatcher) {}

    public function handle(TicketClosed $event): void
    {
        $this->dispatcher->dispatch($event->ticket->tenant, 'ticket.closed', $this->ticketPayload($event->ticket));
    }
}
