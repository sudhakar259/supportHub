<?php

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;

class TicketPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tickets.view') || $user->isCustomer();
    }

    public function view(User $user, Ticket $ticket): bool
    {
        if ($user->isCustomer()) {
            return $ticket->customer?->user_id === $user->id;
        }

        return $user->can('tickets.view') && $this->hasStaffAccess($user, $ticket);
    }

    public function create(User $user): bool
    {
        return $user->can('tickets.create');
    }

    public function update(User $user, Ticket $ticket): bool
    {
        if ($user->isCustomer()) {
            return $ticket->customer?->user_id === $user->id && ! $ticket->status->is_closed;
        }

        return $user->can('tickets.update') && $this->hasStaffAccess($user, $ticket);
    }

    public function assign(User $user, Ticket $ticket): bool
    {
        return $user->can('tickets.assign') && $this->hasStaffAccess($user, $ticket);
    }

    public function escalate(User $user, Ticket $ticket): bool
    {
        return $user->can('tickets.escalate') && $this->hasStaffAccess($user, $ticket);
    }

    public function resolve(User $user, Ticket $ticket): bool
    {
        return $user->can('tickets.resolve') && $this->hasStaffAccess($user, $ticket);
    }

    public function close(User $user, Ticket $ticket): bool
    {
        return $user->can('tickets.close') && $this->hasStaffAccess($user, $ticket);
    }

    public function reopen(User $user, Ticket $ticket): bool
    {
        if ($user->isCustomer()) {
            return $ticket->customer?->user_id === $user->id;
        }

        return $user->can('tickets.reopen') && $this->hasStaffAccess($user, $ticket);
    }

    public function delete(User $user, Ticket $ticket): bool
    {
        return $user->can('tickets.delete');
    }

    public function viewInternalNotes(User $user, Ticket $ticket): bool
    {
        return $user->can('tickets.view_internal_notes') && $this->hasStaffAccess($user, $ticket);
    }

    public function createInternalNote(User $user, Ticket $ticket): bool
    {
        return $this->viewInternalNotes($user, $ticket);
    }

    /**
     * Administrators and anyone directly assigned to the ticket always
     * have access; everyone else must belong to the ticket's department
     * (or the ticket must not yet be routed to one).
     */
    private function hasStaffAccess(User $user, Ticket $ticket): bool
    {
        if ($user->hasRole('Administrator')) {
            return true;
        }

        if ($ticket->assignee_id === $user->id) {
            return true;
        }

        if (! $ticket->department_id) {
            return true;
        }

        return $user->departments()->whereKey($ticket->department_id)->exists();
    }
}
