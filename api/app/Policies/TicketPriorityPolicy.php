<?php

namespace App\Policies;

use App\Models\TicketPriority;
use App\Models\User;

class TicketPriorityPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('priorities.view');
    }

    public function view(User $user, TicketPriority $priority): bool
    {
        return $user->can('priorities.view');
    }

    public function create(User $user): bool
    {
        return $user->can('priorities.create');
    }

    public function update(User $user, TicketPriority $priority): bool
    {
        return $user->can('priorities.update');
    }

    public function delete(User $user, TicketPriority $priority): bool
    {
        return $user->can('priorities.delete');
    }
}
