<?php

namespace App\Policies;

use App\Models\SlaPolicy;
use App\Models\User;

class SlaPolicyPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('sla.view');
    }

    public function view(User $user, SlaPolicy $policy): bool
    {
        return $user->can('sla.view');
    }

    public function create(User $user): bool
    {
        return $user->can('sla.manage');
    }

    public function update(User $user, SlaPolicy $policy): bool
    {
        return $user->can('sla.manage');
    }

    public function delete(User $user, SlaPolicy $policy): bool
    {
        return $user->can('sla.manage');
    }
}
