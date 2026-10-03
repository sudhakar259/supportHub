<?php

use App\Models\MembershipPlan;
use App\Models\Tenant;
use Database\Seeders\MembershipPlanSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed([RolesAndPermissionsSeeder::class, MembershipPlanSeeder::class]);
});

it('lets a platform admin list every tenant across the platform', function () {
    $tenantA = testTenant();
    actingAsAdministrator($tenantA);

    $tenantB = Tenant::create(['name' => 'Other Org', 'slug' => 'other-org-'.uniqid(), 'status' => 'trial', 'trial_ends_at' => now()->addDays(14)]);

    $platformAdmin = actingAsPlatformAdmin();

    $response = $this->actingAs($platformAdmin, 'api')
        ->getJson('/api/v1/platform/tenants')
        ->assertOk();

    $slugs = collect($response->json('data'))->pluck('slug');
    expect($slugs)->toContain($tenantA->slug, $tenantB->slug);
});

it('rejects a tenant administrator from reaching any platform endpoint', function () {
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/platform/tenants')
        ->assertStatus(403);
});

it('lets a platform admin suspend and reactivate a tenant', function () {
    $tenant = testTenant();
    $platformAdmin = actingAsPlatformAdmin();

    $this->actingAs($platformAdmin, 'api')
        ->postJson("/api/v1/platform/tenants/{$tenant->id}/suspend")
        ->assertOk()
        ->assertJsonPath('data.status', 'suspended');

    $tenant->refresh();
    expect($tenant->status)->toBe('suspended');
    expect($tenant->suspended_at)->not->toBeNull();

    $this->assertDatabaseHas('audit_logs', ['action' => 'platform.tenant.suspended', 'auditable_id' => $tenant->id]);

    $this->actingAs($platformAdmin, 'api')
        ->postJson("/api/v1/platform/tenants/{$tenant->id}/activate")
        ->assertOk()
        ->assertJsonPath('data.status', 'active');

    $tenant->refresh();
    expect($tenant->status)->toBe('active');
    expect($tenant->suspended_at)->toBeNull();
});

it('blocks a suspended tenant\'s users from authenticating against tenant-scoped routes', function () {
    $tenant = testTenant();
    $admin = actingAsAdministrator($tenant);
    $platformAdmin = actingAsPlatformAdmin();

    $this->actingAs($platformAdmin, 'api')->postJson("/api/v1/platform/tenants/{$tenant->id}/suspend")->assertOk();

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/departments')
        ->assertStatus(403)
        ->assertJsonPath('message', 'This tenant account is suspended or no longer active.');
});

it('lets a platform admin create and update a membership plan', function () {
    $platformAdmin = actingAsPlatformAdmin();

    $response = $this->actingAs($platformAdmin, 'api')
        ->postJson('/api/v1/platform/membership-plans', [
            'name' => 'Growth',
            'slug' => 'growth',
            'price_cents' => 9900,
            'billing_interval' => 'monthly',
            'limits' => ['users' => 25],
        ])
        ->assertCreated()
        ->assertJsonPath('data.slug', 'growth');

    $planId = $response->json('data.id');

    $this->actingAs($platformAdmin, 'api')
        ->putJson("/api/v1/platform/membership-plans/{$planId}", ['price_cents' => 12900])
        ->assertOk()
        ->assertJsonPath('data.price_cents', 12900);

    expect(MembershipPlan::find($planId)->limits)->toBe(['users' => 25]);
});

it('returns a platform-wide dashboard summary', function () {
    testTenant();
    $platformAdmin = actingAsPlatformAdmin();

    $this->actingAs($platformAdmin, 'api')
        ->getJson('/api/v1/platform/dashboard')
        ->assertOk()
        ->assertJsonStructure(['data' => ['tenants' => ['total', 'active', 'trial', 'suspended'], 'platform_admins', 'subscriptions_by_plan']]);
});
