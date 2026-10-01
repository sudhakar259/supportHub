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

        // Previously staff could edit/reply to a closed ticket with no
        // restriction at all — only the customer branch above checked
        // is_closed. "Closed" should mean frozen for everyone, not just
        // customers; reopening (a separate ability, see reopen()) is the
        // only way back in for staff too.
        return $user->can('tickets.update') && $this->hasStaffAccess($user, $ticket) && ! $ticket->status->is_closed;
    }

    public function assign(User $user, Ticket $ticket): bool
    {
        return $user->can('tickets.assign') && $this->hasStaffAccess($user, $ticket) && ! $ticket->status->is_closed;
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
        // Deliberately NOT a plain delegate to viewInternalNotes(): reading
        // existing notes on a closed ticket should still work, but writing
        // a new one is a write action and should freeze along with
        // update()/assign() once the ticket is closed.
        return $this->viewInternalNotes($user, $ticket) && ! $ticket->status->is_closed;
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
