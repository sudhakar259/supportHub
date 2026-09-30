<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Permissions are grouped by resource. `view_internal_notes` gates
     * whether internal notes are visible on a ticket at all — customers
     * never hold it, so the internal-note leak is impossible by
     * construction, not just by controller logic.
     */
    public const PERMISSIONS = [
        'tickets' => ['view', 'view_internal_notes', 'create', 'update', 'assign', 'escalate', 'resolve', 'close', 'reopen', 'delete'],
        'users' => ['view', 'create', 'update', 'delete'],
        'customers' => ['view', 'create', 'update', 'delete'],
        'departments' => ['view', 'create', 'update', 'delete'],
        'categories' => ['view', 'create', 'update', 'delete'],
        'priorities' => ['view', 'create', 'update', 'delete'],
        'statuses' => ['view', 'create', 'update', 'delete'],
        'routing' => ['view', 'manage'],
        'sla' => ['view', 'manage'],
        'notifications' => ['view', 'manage'],
        'reports' => ['view'],
        'audit-logs' => ['view'],
        'roles' => ['view', 'manage'],
        'settings' => ['view', 'manage'],
    ];

    /**
     * @var array<string, array<int, string>|'*'>
     */
    public const ROLE_PERMISSIONS = [
        'Administrator' => '*',

        'Department Manager' => [
            'tickets.view', 'tickets.view_internal_notes', 'tickets.create', 'tickets.update',
            'tickets.assign', 'tickets.escalate', 'tickets.resolve', 'tickets.close', 'tickets.reopen',
            'users.view', 'customers.view',
            'departments.view', 'departments.update',
            'categories.view', 'priorities.view', 'statuses.view',
            'routing.view', 'sla.view',
            'notifications.view',
            'reports.view', 'audit-logs.view',
        ],

        'Senior Agent' => [
            'tickets.view', 'tickets.view_internal_notes', 'tickets.create', 'tickets.update',
            'tickets.assign', 'tickets.escalate', 'tickets.resolve', 'tickets.close', 'tickets.reopen',
            'users.view', 'customers.view',
            'categories.view', 'priorities.view', 'statuses.view',
            'reports.view',
        ],

        'Agent' => [
            'tickets.view', 'tickets.view_internal_notes', 'tickets.create', 'tickets.update',
            'tickets.resolve',
            'customers.view',
            'categories.view', 'priorities.view', 'statuses.view',
        ],

        'Customer' => [
            'tickets.view', 'tickets.create', 'tickets.update', 'tickets.reopen',
        ],
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $all = [];

        foreach (self::PERMISSIONS as $resource => $actions) {
            foreach ($actions as $action) {
                $all[] = Permission::firstOrCreate(['name' => "{$resource}.{$action}", 'guard_name' => 'api']);
            }
        }

        foreach (self::ROLE_PERMISSIONS as $roleName => $permissions) {
            $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'api']);

            if ($permissions === '*') {
                $role->syncPermissions(Permission::where('guard_name', 'api')->get());

                continue;
            }

            $role->syncPermissions($permissions);
        }
    }
}
