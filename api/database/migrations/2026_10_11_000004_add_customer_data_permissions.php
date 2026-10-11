<?php

use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

/**
 * Exporting and erasing a customer's personal data are separate, sensitive
 * abilities. Administrator roles get every permission when a workspace is
 * created, so workspaces that already exist need these two granted here.
 */
return new class extends Migration
{
    private const NAMES = ['customers.export', 'customers.erase'];

    public function up(): void
    {
        $permissions = collect(self::NAMES)->map(fn (string $name) => Permission::firstOrCreate(['name' => $name, 'guard_name' => 'api']));

        Role::query()
            ->where('name', 'Administrator')
            ->where('guard_name', 'api')
            ->whereNotNull('tenant_id')
            ->get()
            ->each(fn (Role $role) => $role->givePermissionTo($permissions->all()));

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        Permission::whereIn('name', self::NAMES)->where('guard_name', 'api')->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
