<?php

namespace App\Policies;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;

class RolePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('roles.view');
    }

    public function view(User $user, Role $role): bool
    {
        return $user->can('roles.view');
    }

    public function create(User $user): bool
    {
        return $user->can('roles.manage');
    }

    public function update(User $user, Role $role): bool
    {
        return $user->can('roles.manage');
    }

    public function delete(User $user, Role $role): bool
    {
        return $user->can('roles.manage') && ! $this->isSystemRole($role);
    }

    private function isSystemRole(Role $role): bool
    {
        return in_array($role->name, [
            ...array_keys(RolesAndPermissionsSeeder::ROLE_PERMISSIONS),
            RolesAndPermissionsSeeder::PLATFORM_ADMIN_ROLE,
        ], true);
    }
}
