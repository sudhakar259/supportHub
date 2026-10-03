<?php

namespace App\Listeners\Webhook;

use App\Events\AgentReplied;
use App\Services\WebhookDispatcher;
use Illuminate\Contracts\Queue\ShouldQueue;

class DispatchAgentRepliedWebhook implements ShouldQueue
{
    use BuildsWebhookPayload;

    public function __construct(private WebhookDispatcher $dispatcher) {}

    public function handle(AgentReplied $event): void
    {
        $ticket = $event->message->ticket;

        $payload = $this->ticketPayload($ticket) + [
            'message' => ['id' => $event->message->id, 'author_id' => $event->message->author_id, 'type' => 'agent_reply'],
        ];

        $this->dispatcher->dispatch($ticket->tenant, 'ticket.replied', $payload);
    }
}
