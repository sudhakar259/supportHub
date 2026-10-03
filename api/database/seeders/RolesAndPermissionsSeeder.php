<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Permissions are global (the `permissions` table has no tenant_id —
     * only `roles` and the model_has_* pivots do, via spatie's teams
     * feature). "tickets.view" means the same thing everywhere; what
     * differs per tenant is which role has which permissions, not the
     * permission's existence. `view_internal_notes` gates whether
     * internal notes are visible on a ticket at all — customers never
     * hold it, so the internal-note leak is impossible by construction,
     * not just by controller logic.
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
        'api-credentials' => ['view', 'create', 'update', 'revoke'],
        'webhooks' => ['view', 'manage'],
        'billing' => ['view', 'manage'],
    ];

    /**
     * Every role here is tenant-scoped (created once per tenant by
     * TenantProvisioningService, not once globally) — these are role
     * *names and permission sets*, not role rows. "Administrator" is
     * kept as the name for what the spec calls "Tenant Owner/Tenant
     * Admin" rather than renamed, to avoid an unnecessary breaking
     * change to every existing consumer of this API (section 44/53).
     *
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

    /**
     * The one role that exists OUTSIDE any tenant (tenant_id = NULL on
     * the role row, pivot-assigned with the 0/"platform" sentinel — see
     * TenantContext::permissionsTeamId()). Deliberately holds none of
     * the tenant-domain permissions above (a platform admin doesn't
     * read/write tickets directly); RequirePlatformAdmin checks the
     * role itself, not a permission, since the platform surface is
     * small and doesn't yet need finer-grained platform permissions.
     */
    public const PLATFORM_ADMIN_ROLE = 'Platform Admin';

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $resource => $actions) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(['name' => "{$resource}.{$action}", 'guard_name' => 'api']);
            }
        }

        Role::firstOrCreate([
            'name' => self::PLATFORM_ADMIN_ROLE,
            'guard_name' => 'api',
            'tenant_id' => null,
        ]);
    }
}
