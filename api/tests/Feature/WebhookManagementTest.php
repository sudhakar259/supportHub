<?php

use App\Models\Tenant;
use App\Models\Webhook;
use App\Models\WebhookDelivery;
use App\Services\TenantProvisioningService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Http;

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

it('sends a signed test event and logs it as an ordinary delivery', function () {
    Http::fake(['*' => Http::response('ok', 200)]);

    $admin = actingAsAdministrator();
    $webhook = Webhook::factory()->create(['events' => ['ticket.created']]);

    $this->actingAs($admin, 'api')
        ->postJson("/api/v1/webhooks/{$webhook->id}/test")
        ->assertOk()
        ->assertJsonPath('data.event', 'webhook.test')
        ->assertJsonPath('data.success', true);

    Http::assertSent(function ($request) use ($webhook) {
        $body = json_encode($request->data());
        $expectedSignature = $webhook->sign($body);

        return $request->url() === $webhook->url
            && $request['event'] === 'webhook.test'
            && $request->header('X-Webhook-Signature')[0] === $expectedSignature;
    });

    $delivery = WebhookDelivery::where('webhook_id', $webhook->id)->where('event', 'webhook.test')->first();
    expect($delivery)->not->toBeNull();
    expect($delivery->success)->toBeTrue();
});

it('records a failed test delivery without retrying', function () {
    Http::fake(['*' => Http::response('server error', 500)]);

    $admin = actingAsAdministrator();
    $webhook = Webhook::factory()->create(['events' => ['ticket.created']]);

    $this->actingAs($admin, 'api')
        ->postJson("/api/v1/webhooks/{$webhook->id}/test")
        ->assertOk()
        ->assertJsonPath('data.success', false)
        ->assertJsonPath('data.response_status', 500);

    expect(WebhookDelivery::where('webhook_id', $webhook->id)->count())->toBe(1);
});

it('forbids a non-admin from sending a test webhook', function () {
    $agent = actingAsAgent();
    $webhook = Webhook::factory()->create();

    $this->actingAs($agent, 'api')
        ->postJson("/api/v1/webhooks/{$webhook->id}/test")
        ->assertStatus(403);
});

it('rotates a webhook\'s secret and invalidates the old one', function () {
    $admin = actingAsAdministrator();
    $webhook = Webhook::factory()->create();
    $oldSecret = $webhook->secret;

    $response = $this->actingAs($admin, 'api')
        ->postJson("/api/v1/webhooks/{$webhook->id}/rotate-secret")
        ->assertOk()
        ->assertJsonStructure(['data' => ['secret']]);

    $newSecret = $response->json('data.secret');

    expect($newSecret)->not->toBe($oldSecret);
    expect($webhook->refresh()->secret)->toBe($newSecret);
});
