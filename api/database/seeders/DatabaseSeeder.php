<?php

namespace Database\Seeders;

use App\Models\MembershipPlan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Services\TenantProvisioningService;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Platform-level data first: global permissions + the Platform
        // Admin role (no tenant), and the platform-default notification
        // templates / public settings every tenant falls back to.
        $this->call([
            RolesAndPermissionsSeeder::class,
            NotificationTemplateSeeder::class,
            SystemSettingSeeder::class,
            PlatformAdminSeeder::class,
            MembershipPlanSeeder::class,
        ]);

        // Demo data lives inside two separate tenants specifically so
        // tenant isolation is visible/testable out of the box — see
        // docs/multi-tenancy.md. "Acme Support" mirrors this project's
        // original single-tenant demo data; "Globex Helpdesk" is a
        // second, smaller tenant to prove against.
        $acme = Tenant::firstOrCreate(
            ['slug' => 'acme-support'],
            ['name' => 'Acme Support', 'status' => 'active', 'timezone' => 'UTC']
        );
        $globex = Tenant::firstOrCreate(
            ['slug' => 'globex-helpdesk'],
            ['name' => 'Globex Helpdesk', 'status' => 'trial', 'trial_ends_at' => now()->addDays(14), 'timezone' => 'UTC']
        );

        $professional = MembershipPlan::where('slug', 'professional')->first();
        $starter = MembershipPlan::where('slug', 'starter')->first();

        Subscription::updateOrCreate(['tenant_id' => $acme->id], [
            'membership_plan_id' => $professional->id,
            'status' => 'active',
            'current_period_ends_at' => now()->addMonth(),
        ]);

        Subscription::updateOrCreate(['tenant_id' => $globex->id], [
            'membership_plan_id' => $starter->id,
            'status' => 'trial',
            'trial_ends_at' => $globex->trial_ends_at,
        ]);

        app(TenantContext::class)->runAs($acme, function () use ($acme) {
            app(TenantProvisioningService::class)->provision($acme);

            $this->call([
                DepartmentSeeder::class,
                TicketCategorySeeder::class,
                BusinessHoursSeeder::class,
                SlaPolicySeeder::class,
                UsersSeeder::class,
                DemoTicketSeeder::class,
            ]);
        });

        app(TenantContext::class)->runAs($globex, function () use ($globex) {
            app(TenantProvisioningService::class)->provision($globex);

            $this->call(GlobexDemoSeeder::class);
        });
    }
}
