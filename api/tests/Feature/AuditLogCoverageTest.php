<?php

use App\Models\AuditLog;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Webhook;
use App\Services\AuditLogger;
use App\Services\TenantProvisioningService;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Hash;

/**
 * Section 42 asks for audit coverage of a specific action list. Each
 * test here drives the real endpoint rather than calling AuditLogger
 * directly, so it also proves the action is wired into the actual
 * request path, not just that the service works in isolation.
 */
beforeEach(function () {
    testTenant();
});

it('logs a user login', function () {
    $tenant = testTenant();
    $user = User::factory()->create(['email' => 'audit-login@example.com', 'password' => Hash::make('password')]);

    $this->postJson('/api/v1/auth/login', ['email' => 'audit-login@example.com', 'password' => 'password'])
        ->assertOk();

    $log = AuditLog::where('action', 'auth.login')->where('auditable_id', $user->id)->first();
    expect($log)->not->toBeNull();
    expect($log->tenant_id)->toBe($tenant->id);
});

it('logs a ticket assignment', function () {
    $ticket = Ticket::factory()->create();
    $agent = actingAsAgent();
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/assign", ['assignee_id' => $agent->id])
        ->assertOk();

    $log = AuditLog::where('action', 'ticket.assigned')->where('auditable_id', $ticket->id)->first();
    expect($log)->not->toBeNull();
    expect($log->new_values['assignee_id'])->toBe($agent->id);
});

it('logs customer creation', function () {
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/customers', [
            'name' => 'Jamie Rivera', 'email' => 'jamie-audit@example.com',
            'password' => 'Secret123!', 'password_confirmation' => 'Secret123!',
        ])->assertCreated();

    expect(AuditLog::where('action', 'customer.created')->exists())->toBeTrue();
});

it('logs staff user creation and role changes', function () {
    $admin = actingAsAdministrator();

    $response = $this->actingAs($admin, 'api')
        ->postJson('/api/v1/users', [
            'name' => 'Alex Agent', 'email' => 'alex-audit@example.com',
            'password' => 'Secret123!', 'password_confirmation' => 'Secret123!',
            'role' => 'Agent',
        ])->assertCreated();

    $userId = $response->json('data.id');
    expect(AuditLog::where('action', 'user.created')->where('auditable_id', $userId)->exists())->toBeTrue();

    $this->actingAs($admin, 'api')
        ->putJson("/api/v1/users/{$userId}/roles", ['roles' => ['Senior Agent']])
        ->assertOk();

    $log = AuditLog::where('action', 'user.role_changed')->where('auditable_id', $userId)->first();
    expect($log)->not->toBeNull();
    expect($log->old_values['roles'])->toBe(['Agent']);
    expect($log->new_values['roles'])->toBe(['Senior Agent']);
});

it('logs API credential creation, secret rotation and revocation', function () {
    $admin = actingAsAdministrator();

    $response = $this->actingAs($admin, 'api')
        ->postJson('/api/v1/api-credentials', ['name' => 'Chat widget', 'scopes' => ['customers.read']])
        ->assertCreated();

    $credentialId = $response->json('data.id');
    expect(AuditLog::where('action', 'api_credential.created')->where('auditable_id', $credentialId)->exists())->toBeTrue();

    $this->actingAs($admin, 'api')->postJson("/api/v1/api-credentials/{$credentialId}/rotate")->assertOk();
    expect(AuditLog::where('action', 'api_credential.secret_rotated')->where('auditable_id', $credentialId)->exists())->toBeTrue();

    $this->actingAs($admin, 'api')->postJson("/api/v1/api-credentials/{$credentialId}/revoke")->assertOk();
    expect(AuditLog::where('action', 'api_credential.revoked')->where('auditable_id', $credentialId)->exists())->toBeTrue();
});

it('logs webhook creation, update, secret rotation and deletion', function () {
    $admin = actingAsAdministrator();

    $response = $this->actingAs($admin, 'api')
        ->postJson('/api/v1/webhooks', [
            'name' => 'Ticket sync', 'url' => 'https://example.com/hook', 'events' => ['ticket.created'],
        ])->assertCreated();

    $webhookId = $response->json('data.id');
    expect(AuditLog::where('action', 'webhook.created')->where('auditable_id', $webhookId)->exists())->toBeTrue();

    $this->actingAs($admin, 'api')
        ->putJson("/api/v1/webhooks/{$webhookId}", ['name' => 'Ticket sync (v2)'])
        ->assertOk();
    expect(AuditLog::where('action', 'webhook.updated')->where('auditable_id', $webhookId)->exists())->toBeTrue();

    $this->actingAs($admin, 'api')->postJson("/api/v1/webhooks/{$webhookId}/rotate-secret")->assertOk();
    expect(AuditLog::where('action', 'webhook.secret_rotated')->where('auditable_id', $webhookId)->exists())->toBeTrue();

    $this->actingAs($admin, 'api')->deleteJson("/api/v1/webhooks/{$webhookId}")->assertOk();
    expect(AuditLog::where('action', 'webhook.deleted')->where('auditable_id', $webhookId)->exists())->toBeTrue();
});

it('scopes audit log visibility to the viewer\'s own tenant', function () {
    $tenantB = Tenant::create(['name' => 'Other Org', 'slug' => 'other-org-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($tenantB);
    $webhookB = Webhook::factory()->create(['tenant_id' => $tenantB->id]);
    app(TenantContext::class)->runAs($tenantB, function () use ($webhookB) {
        app(AuditLogger::class)->log('webhook.created', $webhookB);
    });

    $adminA = actingAsAdministrator();

    $response = $this->actingAs($adminA, 'api')->getJson('/api/v1/audit-logs')->assertOk();

    expect(collect($response->json('data'))->pluck('action'))->not->toContain('webhook.created');
});
