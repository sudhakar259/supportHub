<?php

use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

/**
 * Administrator roles get every permission at provisioning time, so tenants
 * created before "users.impersonate" existed would not hold it. Creates the
 * permission and grants it to each tenant's Administrator role.
 */
return new class extends Migration
{
    public function up(): void
    {
        $permission = Permission::firstOrCreate(['name' => 'users.impersonate', 'guard_name' => 'api']);

        Role::query()
            ->where('name', 'Administrator')
            ->where('guard_name', 'api')
            ->whereNotNull('tenant_id')
            ->get()
            ->each(fn (Role $role) => $role->givePermissionTo($permission));

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        Permission::where('name', 'users.impersonate')->where('guard_name', 'api')->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
