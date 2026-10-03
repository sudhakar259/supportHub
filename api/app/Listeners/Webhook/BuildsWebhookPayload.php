<?php

namespace App\Listeners\Webhook;

use App\Models\Ticket;

trait BuildsWebhookPayload
{
    /**
     * Deliberately smaller than TicketResource — a webhook payload is
     * read by the tenant's OWN backend, which already has its own
     * copy of anything beyond these identifying/status fields (and
     * doesn't need, say, every custom field or internal note).
     */
    protected function ticketPayload(Ticket $ticket): array
    {
        return [
            'id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'subject' => $ticket->subject,
            'status' => $ticket->status?->slug,
            'priority' => $ticket->priority?->slug,
            'department_id' => $ticket->department_id,
            'customer_id' => $ticket->customer_id,
            'assignee_id' => $ticket->assignee_id,
            'created_at' => $ticket->created_at?->toIso8601String(),
            'updated_at' => $ticket->updated_at?->toIso8601String(),
        ];
    }
}
