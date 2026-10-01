<?php

namespace App\Policies;

use App\Models\TicketRoutingRule;
use App\Models\User;

class TicketRoutingRulePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('routing.view');
    }

    public function view(User $user, TicketRoutingRule $rule): bool
    {
        return $user->can('routing.view');
    }

    public function create(User $user): bool
    {
        return $user->can('routing.manage');
    }

    public function update(User $user, TicketRoutingRule $rule): bool
    {
        return $user->can('routing.manage');
    }

    public function delete(User $user, TicketRoutingRule $rule): bool
    {
        return $user->can('routing.manage');
    }
}
