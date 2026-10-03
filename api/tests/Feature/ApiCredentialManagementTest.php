<?php

use App\Models\ApiCredential;
use App\Models\Tenant;
use App\Services\TenantProvisioningService;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

it('creates an API credential and returns the plain secret exactly once', function () {
    $admin = actingAsAdministrator();

    $response = $this->actingAs($admin, 'api')
        ->postJson('/api/v1/api-credentials', [
            'name' => 'Chat widget',
            'scopes' => ['customers.read', 'tickets.create'],
        ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Chat widget')
        ->assertJsonStructure(['data' => ['key', 'secret', 'secret_last_four']]);

    $plainSecret = $response->json('data.secret');
    $credentialId = $response->json('data.id');

    $listResponse = $this->actingAs($admin, 'api')->getJson('/api/v1/api-credentials')->assertOk();
    expect($listResponse->json('data.0'))->not->toHaveKey('secret');
    expect(ApiCredential::find($credentialId)->secret_hash)->not->toBe($plainSecret);
});

it('rotates a credential\'s secret, invalidating the old one', function () {
    $admin = actingAsAdministrator();

    $created = $this->actingAs($admin, 'api')
        ->postJson('/api/v1/api-credentials', ['name' => 'CRM sync', 'scopes' => ['customers.read']])
        ->assertCreated();

    $credentialId = $created->json('data.id');
    $oldSecret = $created->json('data.secret');

    $rotated = $this->actingAs($admin, 'api')
        ->postJson("/api/v1/api-credentials/{$credentialId}/rotate")
        ->assertOk();

    $newSecret = $rotated->json('data.secret');
    expect($newSecret)->not->toBe($oldSecret);

    $credential = ApiCredential::find($credentialId);
    expect($credential->verifySecret($oldSecret))->toBeFalse();
    expect($credential->verifySecret($newSecret))->toBeTrue();
});

it('revokes a credential, which can no longer authenticate', function () {
    $admin = actingAsAdministrator();

    $created = $this->actingAs($admin, 'api')
        ->postJson('/api/v1/api-credentials', ['name' => 'Old integration', 'scopes' => ['customers.read']])
        ->assertCreated();

    $credentialId = $created->json('data.id');
    $key = $created->json('data.key');
    $secret = $created->json('data.secret');

    $this->actingAs($admin, 'api')
        ->postJson("/api/v1/api-credentials/{$credentialId}/revoke")
        ->assertOk()
        ->assertJsonPath('data.status', 'revoked');

    $this->withHeaders(['X-Api-Key' => $key, 'X-Api-Secret' => $secret])
        ->getJson('/api/v1/integration/customers')
        ->assertStatus(401);
});

it('forbids a non-admin from creating API credentials', function () {
    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')
        ->postJson('/api/v1/api-credentials', ['name' => 'x', 'scopes' => ['customers.read']])
        ->assertStatus(403);
});

it('404s accessing another tenant\'s API credential', function () {
    $tenantB = Tenant::create(['name' => 'Other Org', 'slug' => 'other-org-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($tenantB);
    $credentialB = ApiCredential::factory()->create(['tenant_id' => $tenantB->id]);

    $adminA = actingAsAdministrator();

    $this->actingAs($adminA, 'api')
        ->getJson("/api/v1/api-credentials/{$credentialB->id}")
        ->assertStatus(404);
});
