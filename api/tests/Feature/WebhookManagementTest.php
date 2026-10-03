<?php

use App\Models\Tenant;
use App\Models\Webhook;
use App\Services\TenantProvisioningService;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

it('creates a webhook and returns the plain secret exactly once', function () {
    $admin = actingAsAdministrator();

    $response = $this->actingAs($admin, 'api')
        ->postJson('/api/v1/webhooks', [
            'name' => 'Ticket sync',
            'url' => 'https://example.com/webhooks/supporthub',
            'events' => ['ticket.created', 'ticket.status_changed'],
        ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Ticket sync')
        ->assertJsonStructure(['data' => ['secret']]);

    $webhookId = $response->json('data.id');

    $listResponse = $this->actingAs($admin, 'api')->getJson('/api/v1/webhooks')->assertOk();
    expect($listResponse->json('data.0'))->not->toHaveKey('secret');
    expect(Webhook::find($webhookId)->secret)->not->toBeNull();
});

it('rejects a webhook url pointing at a private or loopback address', function () {
    $admin = actingAsAdministrator();

    foreach (['http://127.0.0.1/hook', 'http://localhost/hook', 'http://10.0.0.5/hook', 'http://192.168.1.1/hook'] as $url) {
        $this->actingAs($admin, 'api')
            ->postJson('/api/v1/webhooks', ['name' => 'x', 'url' => $url, 'events' => ['ticket.created']])
            ->assertStatus(422)
            ->assertJsonValidationErrors('url');
    }
});

it('deletes a webhook', function () {
    $admin = actingAsAdministrator();
    $webhook = Webhook::factory()->create();

    $this->actingAs($admin, 'api')
        ->deleteJson("/api/v1/webhooks/{$webhook->id}")
        ->assertOk();

    $this->assertDatabaseMissing('webhooks', ['id' => $webhook->id]);
});

it('404s accessing another tenant\'s webhook', function () {
    $tenantB = Tenant::create(['name' => 'Other Org', 'slug' => 'other-org-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($tenantB);
    $webhookB = Webhook::factory()->create(['tenant_id' => $tenantB->id]);

    $adminA = actingAsAdministrator();

    $this->actingAs($adminA, 'api')
        ->getJson("/api/v1/webhooks/{$webhookB->id}")
        ->assertStatus(404);
});

it('forbids a non-admin from managing webhooks', function () {
    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')
        ->postJson('/api/v1/webhooks', ['name' => 'x', 'url' => 'https://example.com/hook', 'events' => ['ticket.created']])
        ->assertStatus(403);
});
