<?php

namespace App\Listeners\Ticket;

use App\Models\Ticket;
use App\Models\User;

trait BuildsTicketNotificationContext
{
    /**
     * @return array<string, string|int|null>
     */
    protected function variables(Ticket $ticket, ?User $agent = null): array
    {
        return [
            'ticket_number' => $ticket->ticket_number,
            'customer_name' => $ticket->customer?->user?->name,
            'agent_name' => $agent?->name ?? $ticket->assignee?->name,
            'department' => $ticket->department?->name,
            'ticket_subject' => $ticket->subject,
            'ticket_status' => $ticket->status?->name,
            'ticket_priority' => $ticket->priority?->name,
            'ticket_url' => $this->ticketUrl($ticket),
        ];
    }

    protected function ticketUrl(Ticket $ticket): string
    {
        return rtrim(config('app.frontend_url'), '/')."/tickets/{$ticket->id}";
    }

    /**
     * @return User[]
     */
    protected function departmentManagersAndSeniorAgents(Ticket $ticket): array
    {
        if (! $ticket->department) {
            return [];
        }

        return $ticket->department->users()
            ->whereHas('roles', fn ($q) => $q->whereIn('name', ['Department Manager', 'Senior Agent']))
            ->get()
            ->all();
    }
}
