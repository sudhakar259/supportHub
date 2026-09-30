<?php

namespace App\Policies;

use App\Models\TicketStatus;
use App\Models\User;

class TicketStatusPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('statuses.view');
    }

    public function view(User $user, TicketStatus $status): bool
    {
        return $user->can('statuses.view');
    }

    public function create(User $user): bool
    {
        return $user->can('statuses.create');
    }

    public function update(User $user, TicketStatus $status): bool
    {
        return $user->can('statuses.update');
    }

    public function delete(User $user, TicketStatus $status): bool
    {
        return $user->can('statuses.delete');
    }
}
