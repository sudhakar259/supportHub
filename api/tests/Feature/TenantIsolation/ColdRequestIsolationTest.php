<?php

use App\Models\ApiCredential;
use App\Models\Customer;
use App\Models\Department;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioningService;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/*
|--------------------------------------------------------------------------
| Cold-request tenant isolation
|--------------------------------------------------------------------------
|
| Every other isolation test in this suite uses actingAsAdministrator()/
| testTenant(), which — as a necessary side effect for other bare
| factory calls to work — pre-establishes the ambient TenantContext
| before the test fires its HTTP request. That accidentally matches
| what ResolveTenantContext would set anyway, which means those tests
| cannot catch a bug where the route's OWN middleware never gets a
| chance to run before the route parameter is resolved from the
| database. This file deliberately clears the ambient context right
| before each request — the same starting state a real, freshly
| booted PHP-FPM worker has — to prove TenantScope is actually being
| applied by the request's own middleware, not by leftover test state.
|
| This guards a critical fix: Laravel's SubstituteBindings middleware
| (which runs the query behind every {department}/{ticket}/{customer}
| implicit binding) is part of the 'api' middleware group and, absent
| an explicit middleware priority, ran BEFORE ResolveTenantContext/
| ResolveIntegrationTenantContext — meaning route-model binding was
| completely unscoped on a cold request, and any tenant's session or
| API credential could fetch any OTHER tenant's row by id. See
| bootstrap/app.php's prependToPriorityList() calls.
*/

beforeEach(function () {
    testTenant();
});

function provisionedTenantColdTest(string $name): Tenant
{
    $tenant = Tenant::create(['name' => $name, 'slug' => Str::slug($name).'-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($tenant);

    return $tenant;
}

it('still 404s a cross-tenant department on a request with no pre-established ambient context', function () {
    $tenantA = provisionedTenantColdTest('Tenant A');
    $tenantB = provisionedTenantColdTest('Tenant B');

    $departmentB = app(TenantContext::class)->runAs(
        $tenantB,
        fn () => Department::create(['name' => 'B Dept', 'code' => 'BDPT', 'is_active' => true])
    );

    $adminA = app(TenantContext::class)->runAs($tenantA, function () use ($tenantA) {
        $user = User::create([
            'tenant_id' => $tenantA->id,
            'name' => 'Admin A',
            'email' => 'admina@example.com',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);
        $user->markEmailAsVerified();
        $user->assignRole('Administrator');

        return $user;
    });

    // The critical step: no actingAsAdministrator()/testTenant() call
    // touched the context on the way to this point, and this clears
    // whatever the setup above left behind — simulating a genuinely
    // fresh request.
    app(TenantContext::class)->clear();

    $this->actingAs($adminA, 'api')
        ->getJson("/api/v1/departments/{$departmentB->id}")
        ->assertStatus(404);
});

it('still 404s a cross-tenant customer via the integration API on a cold request', function () {
    $tenantA = provisionedTenantColdTest('Tenant A');
    $tenantB = provisionedTenantColdTest('Tenant B');

    $customerB = app(TenantContext::class)->runAs(
        $tenantB,
        fn () => Customer::factory()->create(['tenant_id' => $tenantB->id])
    );

    $pair = ApiCredential::generateCredentialPair();
    app(TenantContext::class)->runAs($tenantA, fn () => ApiCredential::create([
        'name' => 'Cold Test Credential',
        'key' => $pair['key'],
        'secret_hash' => Hash::make($pair['secret']),
        'secret_last_four' => substr($pair['secret'], -4),
        'scopes' => ApiCredential::ALL_SCOPES,
        'status' => 'active',
    ]));

    app(TenantContext::class)->clear();

    $this->withHeaders(['X-Api-Key' => $pair['key'], 'X-Api-Secret' => $pair['secret']])
        ->getJson("/api/v1/integration/customers/{$customerB->id}")
        ->assertStatus(404);
});
