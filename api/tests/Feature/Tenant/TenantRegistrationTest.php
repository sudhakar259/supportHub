<?php

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Database\Seeders\MembershipPlanSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->seed(MembershipPlanSeeder::class);
});

it('registers a new organization on the free starter plan and issues a token', function () {
    Notification::fake();

    $response = $this->postJson('/api/v1/tenants/register', [
        'tenant_name' => 'Acme Corp',
        'tenant_slug' => 'acme-corp',
        'owner_name' => 'Jamie Rivera',
        'owner_email' => 'jamie@acme.com',
        'owner_password' => 'Secret123!',
        'owner_password_confirmation' => 'Secret123!',
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.tenant.slug', 'acme-corp')
        ->assertJsonPath('data.tenant.status', 'active')
        ->assertJsonPath('data.user.email', 'jamie@acme.com')
        ->assertJsonPath('data.token_type', 'Bearer')
        ->assertJsonStructure(['data' => ['token']]);

    $tenant = Tenant::where('slug', 'acme-corp')->first();
    expect($tenant)->not->toBeNull();
    expect($tenant->trial_ends_at)->toBeNull();

    $owner = User::where('tenant_id', $tenant->id)->where('email', 'jamie@acme.com')->first();
    expect($owner)->not->toBeNull();

    app(TenantContext::class)->set($tenant);
    expect($owner->hasRole('Administrator'))->toBeTrue();

    expect($tenant->subscription)->not->toBeNull();
    expect($tenant->subscription->status)->toBe('active');
    expect($tenant->subscription->plan->slug)->toBe('starter');
});

it('starts a trial when registering on a paid plan', function () {
    Notification::fake();

    $response = $this->postJson('/api/v1/tenants/register', [
        'tenant_name' => 'Globex Inc',
        'tenant_slug' => 'globex-inc',
        'owner_name' => 'Taylor Shaw',
        'owner_email' => 'taylor@globex.com',
        'owner_password' => 'Secret123!',
        'owner_password_confirmation' => 'Secret123!',
        'plan' => 'professional',
    ]);

    $response->assertCreated()->assertJsonPath('data.tenant.status', 'trial');

    $tenant = Tenant::where('slug', 'globex-inc')->first();
    expect($tenant->trial_ends_at)->not->toBeNull();
    expect($tenant->subscription->status)->toBe('trial');
    expect($tenant->subscription->plan->slug)->toBe('professional');
});

it('rejects registration with a duplicate tenant slug', function () {
    Tenant::create(['name' => 'Existing Org', 'slug' => 'existing-org', 'status' => 'active']);

    $this->postJson('/api/v1/tenants/register', [
        'tenant_name' => 'Another Org',
        'tenant_slug' => 'existing-org',
        'owner_name' => 'Someone',
        'owner_email' => 'someone@example.com',
        'owner_password' => 'Secret123!',
        'owner_password_confirmation' => 'Secret123!',
    ])->assertStatus(422)
        ->assertJsonPath('success', false)
        ->assertJsonValidationErrors('tenant_slug');
});

it('reports a taken slug as unavailable without revealing the tenant', function () {
    Tenant::create(['name' => 'Acme Corp', 'slug' => 'acme-corp', 'status' => 'active']);

    $this->getJson('/api/v1/tenants/lookup/acme-corp')
        ->assertOk()
        ->assertJsonPath('data.available', false)
        ->assertJsonMissingPath('data.name')
        ->assertJsonMissingPath('data.slug');
});

it('reports an unused slug as available', function () {
    $this->getJson('/api/v1/tenants/lookup/does-not-exist')
        ->assertOk()
        ->assertJsonPath('data.available', true);
});
