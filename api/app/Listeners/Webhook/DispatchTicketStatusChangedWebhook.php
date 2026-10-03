<?php

namespace App\Listeners\Webhook;

use App\Events\TicketStatusChanged;
use App\Services\WebhookDispatcher;
use Illuminate\Contracts\Queue\ShouldQueue;

class DispatchTicketStatusChangedWebhook implements ShouldQueue
{
    use BuildsWebhookPayload;

    public function __construct(private WebhookDispatcher $dispatcher) {}

    public function handle(TicketStatusChanged $event): void
    {
        $payload = $this->ticketPayload($event->ticket) + [
            'from_status' => $event->fromStatus->slug,
            'to_status' => $event->toStatus->slug,
        ];

        $this->dispatcher->dispatch($event->ticket->tenant, 'ticket.status_changed', $payload);
    }
}
