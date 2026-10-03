<?php

namespace App\Listeners\Webhook;

use App\Events\CustomerReplied;
use App\Services\WebhookDispatcher;
use Illuminate\Contracts\Queue\ShouldQueue;

class DispatchCustomerRepliedWebhook implements ShouldQueue
{
    use BuildsWebhookPayload;

    public function __construct(private WebhookDispatcher $dispatcher) {}

    public function handle(CustomerReplied $event): void
    {
        $ticket = $event->message->ticket;

        $payload = $this->ticketPayload($ticket) + [
            'message' => ['id' => $event->message->id, 'author_id' => $event->message->author_id, 'type' => 'customer_message'],
        ];

        $this->dispatcher->dispatch($ticket->tenant, 'ticket.replied', $payload);
    }
}
