<?php

use App\Models\MembershipPlan;
use App\Models\Subscription;
use App\Models\Tenant;
use Database\Seeders\MembershipPlanSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    testTenant();
    $this->seed(MembershipPlanSeeder::class);
});

function setTrial(Tenant $tenant, DateTimeInterface $endsAt): void
{
    Subscription::updateOrCreate(['tenant_id' => $tenant->id], [
        'membership_plan_id' => MembershipPlan::where('slug', 'professional')->value('id'),
        'status' => 'trial',
        'trial_ends_at' => $endsAt,
    ]);
}

it('lets a platform admin move a tenant onto a paid plan with a fresh 14-day trial', function () {
    $tenant = testTenant();
    $platformAdmin = actingAsPlatformAdmin();

    $this->actingAs($platformAdmin, 'api')
        ->putJson("/api/v1/platform/tenants/{$tenant->id}/subscription", ['plan' => 'professional'])
        ->assertOk();

    $subscription = $tenant->fresh()->subscription()->first();
    expect($subscription->plan->slug)->toBe('professional');
    expect($subscription->status)->toBe('trial');
    expect($subscription->trial_ends_at->isBetween(now()->addDays(14)->subMinute(), now()->addDays(14)->addMinute()))->toBeTrue();
});

it('activates a tenant without a trial when the plan is free', function () {
    $tenant = testTenant();
    $platformAdmin = actingAsPlatformAdmin();

    $this->actingAs($platformAdmin, 'api')
        ->putJson("/api/v1/platform/tenants/{$tenant->id}/subscription", ['plan' => 'starter'])
        ->assertOk();

    $subscription = $tenant->fresh()->subscription()->first();
    expect($subscription->status)->toBe('active');
    expect($subscription->trial_ends_at)->toBeNull();
});

it('rejects an unknown or inactive plan slug', function () {
    $tenant = testTenant();
    MembershipPlan::where('slug', 'business')->update(['is_active' => false]);
    $platformAdmin = actingAsPlatformAdmin();

    $this->actingAs($platformAdmin, 'api')
        ->putJson("/api/v1/platform/tenants/{$tenant->id}/subscription", ['plan' => 'business'])
        ->assertStatus(404);

    $this->actingAs($platformAdmin, 'api')
        ->putJson("/api/v1/platform/tenants/{$tenant->id}/subscription", ['plan' => 'no-such-plan'])
        ->assertStatus(422);
});

it('forbids a tenant administrator from changing a plan through the platform API', function () {
    $tenant = testTenant();
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->putJson("/api/v1/platform/tenants/{$tenant->id}/subscription", ['plan' => 'professional'])
        ->assertStatus(403);
});

it('blocks tenant workspace routes once a paid trial has ended, but keeps billing reachable', function () {
    $tenant = testTenant();
    $admin = actingAsAdministrator();
    setTrial($tenant, now()->subDay());

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/tickets')
        ->assertStatus(402)
        ->assertJsonPath('message', 'Your free trial has ended. Choose a plan to continue.');

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/subscription')
        ->assertOk();
});

it('lets a tenant workspace continue while the trial is still running', function () {
    $tenant = testTenant();
    $admin = actingAsAdministrator();
    setTrial($tenant, now()->addDays(3));

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/tickets')
        ->assertOk();
});
