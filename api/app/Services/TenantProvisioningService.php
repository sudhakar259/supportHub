<?php

namespace App\Services;

use App\Models\Tenant;
use App\Models\TicketNumberSetting;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use App\Support\TenantContext;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\TicketPrioritySeeder;
use Database\Seeders\TicketStatusSeeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

/**
 * Everything a brand-new tenant needs to actually function, provisioned
 * in one transaction: its own role set (spatie teams scopes roles per
 * tenant_id, so a new tenant needs its own role ROWS, not just
 * permission assignments on shared ones), the standard ticket statuses
 * and priorities, and a default ticket numbering scheme — without
 * these three, CreateTicketAction fails immediately (TicketPriority::
 * default() / TicketStatus::default() / GenerateTicketNumberAction all
 * assume they exist).
 *
 * Departments, business hours, SLA policies and routing rules are
 * deliberately NOT auto-created: a tenant can operate without them
 * (tickets stay unrouted / use calendar-time SLA / no custom rules)
 * and setting them up is a meaningful onboarding step, not boilerplate.
 * Notification templates and system settings are deliberately not
 * copied either — HasTenantOverride means every tenant already sees
 * the platform defaults until they choose to override one.
 */
class TenantProvisioningService
{
    public function __construct(private TenantContext $context) {}

    public function provision(Tenant $tenant): void
    {
        DB::transaction(function () use ($tenant) {
            $this->context->runAs($tenant, function () use ($tenant) {
                $this->createRoles($tenant);

                app(TicketStatusSeeder::class)->run();
                app(TicketPrioritySeeder::class)->run();

                $this->createDefaultTicketNumberSetting();
            });
        });
    }

    private function createRoles(Tenant $tenant): void
    {
        foreach (RolesAndPermissionsSeeder::ROLE_PERMISSIONS as $roleName => $permissions) {
            $role = Role::firstOrCreate([
                'name' => $roleName,
                'guard_name' => 'api',
                'tenant_id' => $tenant->id,
            ]);

            if ($permissions === '*') {
                $role->syncPermissions(Permission::where('guard_name', 'api')->get());

                continue;
            }

            $role->syncPermissions($permissions);
        }
    }

    private function createDefaultTicketNumberSetting(): void
    {
        if (TicketNumberSetting::whereNull('department_id')->where('is_active', true)->exists()) {
            return;
        }

        TicketNumberSetting::create([
            'department_id' => null,
            'prefix' => 'TKT',
            'format' => '{prefix}-{year}-{number}',
            'starting_number' => 1,
            'number_length' => 6,
            'reset_period' => 'yearly',
            'is_active' => true,
            'effective_from' => now(),
        ]);
    }
}
