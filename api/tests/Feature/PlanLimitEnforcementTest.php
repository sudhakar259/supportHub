<?php

use App\Models\MembershipPlan;
use App\Models\Subscription;
use App\Models\Webhook;
use Database\Seeders\MembershipPlanSeeder;

beforeEach(function () {
    testTenant();
    $this->seed(MembershipPlanSeeder::class);
});

it('blocks creating a resource once the plan\'s limit is reached', function () {
    $tenant = testTenant();
    $starter = MembershipPlan::where('slug', 'starter')->firstOrFail();
    Subscription::create(['tenant_id' => $tenant->id, 'membership_plan_id' => $starter->id, 'status' => 'active']);

    // Starter's webhook limit is 1 (see MembershipPlanSeeder).
    Webhook::factory()->create();

    $admin = actingAsAdministrator($tenant);

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/webhooks', [
            'name' => 'Second webhook',
            'url' => 'https://example.com/hook-2',
            'events' => ['ticket.created'],
        ])
        ->assertStatus(403)
        ->assertJsonPath('errors.feature', 'webhooks')
        ->assertJsonPath('errors.limit', 1);
});

it('allows creating a resource when under the plan\'s limit', function () {
    $tenant = testTenant();
    $professional = MembershipPlan::where('slug', 'professional')->firstOrFail();
    Subscription::create(['tenant_id' => $tenant->id, 'membership_plan_id' => $professional->id, 'status' => 'active']);

    $admin = actingAsAdministrator($tenant);

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/webhooks', [
            'name' => 'First webhook',
            'url' => 'https://example.com/hook-1',
            'events' => ['ticket.created'],
        ])
        ->assertCreated();
});

it('treats a tenant with no subscription as unlimited', function () {
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/webhooks', [
            'name' => 'No subscription webhook',
            'url' => 'https://example.com/hook',
            'events' => ['ticket.created'],
        ])
        ->assertCreated();
});
