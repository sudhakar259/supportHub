<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('users.view');
    }

    public function view(User $user, User $target): bool
    {
        return $user->can('users.view') || $user->id === $target->id;
    }

    public function create(User $user): bool
    {
        return $user->can('users.create');
    }

    public function update(User $user, User $target): bool
    {
        return $user->can('users.update') || $user->id === $target->id;
    }

    public function delete(User $user, User $target): bool
    {
        return $user->can('users.delete') && $user->id !== $target->id;
    }

    /**
     * "Login as" — an administrator acting as another user in the same
     * tenant. Deliberately narrow: never yourself, never an inactive
     * account, never another Administrator (no lateral moves between
     * equals), and never from inside an impersonation session (no
     * chaining, so the audit trail always names a real person).
     */
    public function impersonate(User $user, User $target): bool
    {
        if (! $user->can('users.impersonate') || $user->id === $target->id) {
            return false;
        }

        if ($user->tenant_id === null || $user->tenant_id !== $target->tenant_id) {
            return false;
        }

        if (! $target->is_active || $target->hasRole('Administrator')) {
            return false;
        }

        return ! $user->isImpersonated();
    }

    public function manageRoles(User $user, User $target): bool
    {
        return $user->can('roles.manage');
    }
}
