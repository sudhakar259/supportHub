<?php

namespace App\Listeners\Ticket;

use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use App\Support\TenantContext;

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

    /**
     * Queue workers start with no tenant context, so template lookup and
     * branding would fall back to platform rows. Runs the callback inside
     * the tenant that owns the ticket.
     */
    protected function inTenantOf(?Tenant $tenant, callable $callback): void
    {
        app(TenantContext::class)->runAs($tenant, $callback);
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
