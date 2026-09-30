<?php

namespace App\Policies;

use App\Models\TicketCategory;
use App\Models\User;

class TicketCategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('categories.view');
    }

    public function view(User $user, TicketCategory $category): bool
    {
        return $user->can('categories.view');
    }

    public function create(User $user): bool
    {
        return $user->can('categories.create');
    }

    public function update(User $user, TicketCategory $category): bool
    {
        return $user->can('categories.update');
    }

    public function delete(User $user, TicketCategory $category): bool
    {
        return $user->can('categories.delete');
    }
}
