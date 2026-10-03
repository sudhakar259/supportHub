<?php

use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioningService;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->afterEach(function () {
        unset($GLOBALS['__test_tenant']);
        app(TenantContext::class)->clear();
    })
    ->in('Feature', 'Unit');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * One tenant per test, created and fully provisioned (roles, ticket
 * statuses/priorities, default numbering) the first time it's needed
 * and reused for the rest of that test — so actingAsAdministrator()
 * and actingAsAgent() called in the same test land in the same tenant,
 * the way an admin inviting an agent actually would.
 *
 * Backed by $GLOBALS rather than a plain `static` local: RefreshDatabase
 * rolls back each test's transaction, deleting the tenant row, but a
 * PHP `static` variable would still hold the now-stale object reference
 * for the next test in the same process. The afterEach() below clears
 * $GLOBALS explicitly on every test boundary instead.
 */
function testTenant(): Tenant
{
    if (! isset($GLOBALS['__test_tenant'])) {
        $tenant = Tenant::create(['name' => 'Test Tenant', 'slug' => 'test-tenant-'.uniqid(), 'status' => 'active']);
        app(TenantProvisioningService::class)->provision($tenant);
        $GLOBALS['__test_tenant'] = $tenant;
    }

    // Establishing this as the ambient context (not just returning the
    // Tenant object) is deliberate: most existing tests create fixtures
    // with bare Model::factory()->create() calls, not wrapped in
    // actingAsX()/runAs(). Those calls need spatie's permission team id
    // to already match this tenant for any embedded assignRole() (e.g.
    // CustomerFactory's afterCreating callback) to resolve the right
    // tenant-scoped role — setting tenant_id on the row alone doesn't
    // do that; TenantContext::set() is what syncs it (see its docblock).
    app(TenantContext::class)->set($GLOBALS['__test_tenant']);

    return $GLOBALS['__test_tenant'];
}

function actingAsCustomer(?Tenant $tenant = null): User
{
    $tenant ??= testTenant();

    return app(TenantContext::class)->runAs($tenant, function () use ($tenant) {
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole('Customer');

        return $user;
    });
}

function actingAsAgent(?Tenant $tenant = null): User
{
    $tenant ??= testTenant();

    return app(TenantContext::class)->runAs($tenant, function () use ($tenant) {
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole('Agent');

        return $user;
    });
}

function actingAsAdministrator(?Tenant $tenant = null): User
{
    $tenant ??= testTenant();

    return app(TenantContext::class)->runAs($tenant, function () use ($tenant) {
        $user = User::factory()->create(['tenant_id' => $tenant->id]);
        $user->assignRole('Administrator');

        return $user;
    });
}

function actingAsPlatformAdmin(): User
{
    return app(TenantContext::class)->runAs(null, function () {
        $user = User::factory()->create(['tenant_id' => null]);
        $user->assignRole('Platform Admin');

        return $user;
    });
}
