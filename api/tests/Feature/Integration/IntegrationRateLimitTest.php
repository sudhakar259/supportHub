<?php

use App\Models\ApiCredential;
use App\Models\MembershipPlan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Services\TenantProvisioningService;

it('throttles integration API requests once the plan\'s daily request limit is hit', function () {
    $tenant = testTenant();

    $plan = MembershipPlan::create([
        'name' => 'Tiny', 'slug' => 'tiny-'.uniqid(), 'price_cents' => 0,
        'limits' => ['api_requests_per_day' => 2],
        'is_active' => true,
    ]);
    Subscription::create(['tenant_id' => $tenant->id, 'membership_plan_id' => $plan->id, 'status' => 'active']);

    $pair = createIntegrationCredential($tenant, ApiCredential::ALL_SCOPES);

    withIntegrationAuth($this, $pair)->getJson('/api/v1/integration/customers')->assertOk();
    withIntegrationAuth($this, $pair)->getJson('/api/v1/integration/customers')->assertOk();

    $response = withIntegrationAuth($this, $pair)->getJson('/api/v1/integration/customers');

    $response->assertStatus(429)
        ->assertJsonPath('success', false)
        ->assertJsonPath('errors.limit', 2)
        ->assertJsonPath('errors.period', 'day');

    expect($response->headers->has('Retry-After'))->toBeTrue();
});

it('does not throttle a credential belonging to a different tenant', function () {
    $tenant = testTenant();

    $plan = MembershipPlan::create([
        'name' => 'Tiny', 'slug' => 'tiny-'.uniqid(), 'price_cents' => 0,
        'limits' => ['api_requests_per_day' => 1],
        'is_active' => true,
    ]);
    Subscription::create(['tenant_id' => $tenant->id, 'membership_plan_id' => $plan->id, 'status' => 'active']);

    $pair = createIntegrationCredential($tenant, ApiCredential::ALL_SCOPES);

    withIntegrationAuth($this, $pair)->getJson('/api/v1/integration/customers')->assertOk();
    withIntegrationAuth($this, $pair)->getJson('/api/v1/integration/customers')->assertStatus(429);

    $tenantB = Tenant::create(['name' => 'Other Org', 'slug' => 'other-org-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($tenantB);
    $planB = MembershipPlan::create([
        'name' => 'Big', 'slug' => 'big-'.uniqid(), 'price_cents' => 0,
        'limits' => ['api_requests_per_day' => 100],
        'is_active' => true,
    ]);
    Subscription::create(['tenant_id' => $tenantB->id, 'membership_plan_id' => $planB->id, 'status' => 'active']);
    $pairB = createIntegrationCredential($tenantB, ApiCredential::ALL_SCOPES);

    withIntegrationAuth($this, $pairB)->getJson('/api/v1/integration/customers')->assertOk();
});

it('leaves an unlimited plan unthrottled', function () {
    $tenant = testTenant();

    $plan = MembershipPlan::create([
        'name' => 'Unlimited', 'slug' => 'unlimited-'.uniqid(), 'price_cents' => 0,
        'limits' => ['api_requests_per_day' => null],
        'is_active' => true,
    ]);
    Subscription::create(['tenant_id' => $tenant->id, 'membership_plan_id' => $plan->id, 'status' => 'active']);

    $pair = createIntegrationCredential($tenant, ApiCredential::ALL_SCOPES);

    for ($i = 0; $i < 5; $i++) {
        withIntegrationAuth($this, $pair)->getJson('/api/v1/integration/customers')->assertOk();
    }
});
