<?php

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioningService;
use App\Support\TenantContext;

beforeEach(fn () => testTenant());

it('lets an administrator log in as an agent and act as that agent', function () {
    $admin = actingAsAdministrator();
    $agent = actingAsAgent();

    $response = $this->actingAs($admin, 'api')
        ->postJson("/api/v1/users/{$agent->id}/impersonate")
        ->assertOk()
        ->assertJsonPath('data.user.id', $agent->id)
        ->assertJsonPath('data.token_type', 'Bearer');

    $token = $response->json('data.token');
    expect($token)->not->toBeEmpty();

    // The returned token authenticates as the agent, not the administrator.
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.id', $agent->id);
});

it('records the impersonation in the audit log against the administrator', function () {
    $admin = actingAsAdministrator();
    $agent = actingAsAgent();

    $this->actingAs($admin, 'api')->postJson("/api/v1/users/{$agent->id}/impersonate")->assertOk();

    $log = AuditLog::where('action', 'user.impersonated')->latest('id')->first();
    expect($log)->not->toBeNull()
        ->and($log->actor_id)->toBe($admin->id)
        ->and((int) $log->auditable_id)->toBe($agent->id);
});

it('lets an administrator log in as a customer', function () {
    $admin = actingAsAdministrator();
    $customer = actingAsCustomer();

    $this->actingAs($admin, 'api')
        ->postJson("/api/v1/users/{$customer->id}/impersonate")
        ->assertOk()
        ->assertJsonPath('data.user.id', $customer->id);
});

it('forbids non-administrators from impersonating anyone', function () {
    $agent = actingAsAgent();
    $customer = actingAsCustomer();

    $this->actingAs($agent, 'api')->postJson("/api/v1/users/{$customer->id}/impersonate")->assertForbidden();
});

it('forbids impersonating yourself, another administrator, or an inactive user', function () {
    $admin = actingAsAdministrator();
    $otherAdmin = actingAsAdministrator();
    $inactive = actingAsAgent();
    $inactive->update(['is_active' => false]);

    $this->actingAs($admin, 'api')->postJson("/api/v1/users/{$admin->id}/impersonate")->assertForbidden();
    $this->actingAs($admin, 'api')->postJson("/api/v1/users/{$otherAdmin->id}/impersonate")->assertForbidden();
    $this->actingAs($admin, 'api')->postJson("/api/v1/users/{$inactive->id}/impersonate")->assertForbidden();
});

it('cannot reach a user in another tenant', function () {
    $admin = actingAsAdministrator();

    $other = Tenant::create(['name' => 'Other Org', 'slug' => 'other-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($other);
    $foreign = app(TenantContext::class)->runAs($other, function () use ($other) {
        $user = User::factory()->create(['tenant_id' => $other->id]);
        $user->assignRole('Agent');

        return $user;
    });

    $this->actingAs($admin, 'api')->postJson("/api/v1/users/{$foreign->id}/impersonate")->assertNotFound();
});

it('does not allow chaining impersonation from inside an impersonation session', function () {
    $admin = actingAsAdministrator();
    $agent = actingAsAgent();
    $customer = actingAsCustomer();

    $token = $this->actingAs($admin, 'api')
        ->postJson("/api/v1/users/{$agent->id}/impersonate")
        ->json('data.token');

    $this->app['auth']->forgetGuards();
    $this->withToken($token)->postJson("/api/v1/users/{$customer->id}/impersonate")->assertForbidden();
});

it('lets an impersonated session through the email verification gate', function () {
    $admin = actingAsAdministrator();
    $customer = actingAsCustomer();
    $customer->forceFill(['email_verified_at' => null])->save();

    // The customer on their own could not use the workspace yet...
    $own = $customer->createToken('web-browser')->plainTextToken;
    $this->withToken($own)->getJson('/api/v1/tickets')->assertForbidden();
    $this->app['auth']->forgetGuards();

    // ...but the administrator acting as them can.
    $token = $this->actingAs($admin, 'api')->postJson("/api/v1/users/{$customer->id}/impersonate")->json('data.token');
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->getJson('/api/v1/tickets')->assertOk();
});
