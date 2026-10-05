<?php

use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioningService;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

/*
|--------------------------------------------------------------------------
| Password reset tenant disambiguation
|--------------------------------------------------------------------------
|
| Email is unique per tenant, not globally — the same address can be a
| different account in each of several tenants. Laravel's password
| broker resolves a reset request by email alone; without a tenant
| disambiguator, a shared email resolves to whichever account the
| lookup query happens to return first, which is not necessarily the
| one the caller meant. These tests confirm the optional `tenant`
| field (AuthController::passwordResetCredentials()) makes that
| resolution exact instead of ambiguous.
*/

beforeEach(function () {
    testTenant();
});

it('resets only the specified tenant\'s account when the same email exists in two tenants', function () {
    // userA is created first (the lower-id row) specifically so this
    // test is meaningful: Laravel's EloquentUserProvider::
    // retrieveByCredentials() runs no ORDER BY, and in practice
    // returns the lowest-id match first. Targeting tenant B (the
    // SECOND-created, higher-id account) here means this test would
    // fail if the `tenant` disambiguator were ignored and the broker
    // fell through to that natural first match instead.
    $tenantA = testTenant();
    $userA = User::factory()->create(['tenant_id' => $tenantA->id, 'email' => 'shared@example.com']);

    $tenantB = Tenant::create(['name' => 'Other Org', 'slug' => 'other-org-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($tenantB);
    $userB = app(TenantContext::class)->runAs(
        $tenantB,
        fn () => User::factory()->create(['tenant_id' => $tenantB->id, 'email' => 'shared@example.com'])
    );

    $tokenForB = Password::createToken($userB);

    // /auth/reset-password is public and carries no tenant.context
    // middleware (by design — there's no authenticated identity yet
    // to resolve one from), so a real request always starts with no
    // ambient tenant at all. Clearing it here matches that: without
    // it, this test's own setup above would leave tenant A as the
    // still-active ambient context, which would then collide with
    // this request's explicit tenant_id=B constraint and make the
    // lookup impossible to satisfy — a test-harness artifact, not
    // something a real cold request ever hits.
    app(TenantContext::class)->clear();

    $this->postJson('/api/v1/auth/reset-password', [
        'email' => 'shared@example.com',
        'tenant' => $tenantB->slug,
        'token' => $tokenForB,
        'password' => 'NewSecret123!',
        'password_confirmation' => 'NewSecret123!',
    ])->assertOk();

    $userA->refresh();
    $userB->refresh();

    expect(Hash::check('NewSecret123!', $userB->password))->toBeTrue();
    expect(Hash::check('NewSecret123!', $userA->password))->toBeFalse();
});

it('rejects a reset attempt for a tenant slug the email has no account in', function () {
    $tenantA = testTenant();
    User::factory()->create(['tenant_id' => $tenantA->id, 'email' => 'onlyin-a@example.com']);

    $tenantB = Tenant::create(['name' => 'Other Org', 'slug' => 'other-org-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($tenantB);

    app(TenantContext::class)->clear();

    $this->postJson('/api/v1/auth/reset-password', [
        'email' => 'onlyin-a@example.com',
        'tenant' => $tenantB->slug,
        'token' => 'irrelevant-since-no-matching-account',
        'password' => 'NewSecret123!',
        'password_confirmation' => 'NewSecret123!',
    ])->assertStatus(422)->assertJsonValidationErrors('email');
});
