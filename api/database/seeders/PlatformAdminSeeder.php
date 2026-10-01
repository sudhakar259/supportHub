<?php

namespace Database\Seeders;

use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PlatformAdminSeeder extends Seeder
{
    public function run(): void
    {
        // Ensures spatie's team id is the platform sentinel (0), not
        // whatever a prior seeder in this same run left it as — without
        // this, syncRoles() below would assign the role under the wrong
        // team scope. See TenantContext::set()/permissionsTeamId().
        app(TenantContext::class)->clear();

        // tenant_id is deliberately left out of this array (not set to
        // null explicitly either) — User::create() never mass-assigns
        // it (it's not in #[Fillable]), and no TenantContext is active
        // here, so BelongsToTenant's creating() hook stamps nothing,
        // leaving the column at its true NULL: a platform administrator.
        $admin = User::updateOrCreate(
            ['email' => 'platform-admin@supporthub.test'],
            [
                'name' => 'Platform Administrator',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'is_active' => true,
            ]
        );

        $admin->syncRoles([RolesAndPermissionsSeeder::PLATFORM_ADMIN_ROLE]);
    }
}
