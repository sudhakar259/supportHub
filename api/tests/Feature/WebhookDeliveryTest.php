<?php

use App\Exceptions\WebhookDeliveryFailedException;
use App\Jobs\DeliverWebhookJob;
use App\Models\Customer;
use App\Models\Tenant;
use App\Models\Webhook;
use App\Models\WebhookDelivery;
use App\Services\TenantProvisioningService;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    testTenant();
});

it('delivers a signed webhook when a subscribed ticket event fires', function () {
    Http::fake();

    $webhook = Webhook::factory()->create(['events' => ['ticket.created']]);
    $customer = Customer::factory()->create();

    $this->actingAs($customer->user, 'api')
        ->postJson('/api/v1/tickets', ['subject' => 'Webhook test', 'description' => 'Should trigger a delivery.'])
        ->assertCreated();

    Http::assertSent(function ($request) use ($webhook) {
        return $request->url() === $webhook->url
            && $request['event'] === 'ticket.created'
            && $request['data']['subject'] === 'Webhook test'
            && $request->hasHeader('X-Webhook-Signature');
    });

    $delivery = WebhookDelivery::where('webhook_id', $webhook->id)->first();
    expect($delivery)->not->toBeNull();
    expect($delivery->success)->toBeTrue();
    expect($delivery->event)->toBe('ticket.created');
});

it('does not deliver to a webhook not subscribed to that event', function () {
    Http::fake();

    Webhook::factory()->create(['events' => ['ticket.status_changed']]);
    $customer = Customer::factory()->create();

    $this->actingAs($customer->user, 'api')
        ->postJson('/api/v1/tickets', ['subject' => 'No delivery', 'description' => 'Should not trigger.'])
        ->assertCreated();

    Http::assertNothingSent();
});

it('does not deliver to an inactive webhook', function () {
    Http::fake();

    Webhook::factory()->create(['events' => ['ticket.created'], 'is_active' => false]);
    $customer = Customer::factory()->create();

    $this->actingAs($customer->user, 'api')
        ->postJson('/api/v1/tickets', ['subject' => 'No delivery', 'description' => 'Should not trigger.'])
        ->assertCreated();

    Http::assertNothingSent();
});

it('signs the payload so the receiver can verify it came from this platform', function () {
    Http::fake();

    $webhook = Webhook::factory()->create(['events' => ['ticket.created']]);
    $customer = Customer::factory()->create();

    $this->actingAs($customer->user, 'api')
        ->postJson('/api/v1/tickets', ['subject' => 'Signature check', 'description' => 'x'])
        ->assertCreated();

    Http::assertSent(function ($request) use ($webhook) {
        $body = json_encode($request->data());
        $expectedSignature = $webhook->sign($body);

        return $request->header('X-Webhook-Signature')[0] === $expectedSignature;
    });
});

it('logs a failed delivery when the endpoint returns an error', function () {
    // Exercises the job directly rather than through the full
    // TicketCreated -> listener -> dispatch() chain: with
    // QUEUE_CONNECTION=sync (this suite's config), a queued job that
    // throws propagates synchronously all the way back through
    // event() into the HTTP response — exactly like the existing
    // notification listeners already behave in this test environment.
    // A real deployment runs an actual async queue, where this
    // exception surfaces to the queue worker, not the ticket-creation
    // request; this test is about DeliverWebhookJob's own
    // failure-logging behavior, not that request/response boundary.
    Http::fake(['*' => Http::response('server error', 500)]);

    $tenant = testTenant();
    $webhook = Webhook::factory()->create(['tenant_id' => $tenant->id, 'events' => ['ticket.created']]);

    try {
        (new DeliverWebhookJob($webhook, 'ticket.created', ['id' => 1]))->handle();
    } catch (WebhookDeliveryFailedException) {
        // Expected — this is what triggers the queue's own retry.
    }

    $delivery = WebhookDelivery::where('webhook_id', $webhook->id)->first();
    expect($delivery->success)->toBeFalse();
    expect($delivery->response_status)->toBe(500);
});

it('404s accessing another tenant\'s webhook deliveries', function () {
    $tenantB = Tenant::create(['name' => 'Other Org', 'slug' => 'other-org-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($tenantB);
    $webhookB = Webhook::factory()->create(['tenant_id' => $tenantB->id]);

    $adminA = actingAsAdministrator();

    $this->actingAs($adminA, 'api')
        ->getJson("/api/v1/webhooks/{$webhookB->id}/deliveries")
        ->assertStatus(404);
});
