<?php

use App\Models\Webhook;
use App\Models\WebhookDelivery;
use App\Services\WebhookDispatcher;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Http;

it('does not let a failed webhook delivery escape the ticket event that caused it', function () {
    $tenant = testTenant();
    Http::fake(['*' => Http::response('upstream error', 500)]);

    app(TenantContext::class)->runAs($tenant, function () use ($tenant) {
        Webhook::create([
            'name' => 'Resilience probe',
            'url' => 'https://example.com/qa-resilience',
            'secret' => 'whsec_resilience_probe_secret',
            'events' => ['ticket.created'],
            'is_active' => true,
        ]);

        app(WebhookDispatcher::class)->dispatch($tenant, 'ticket.created', ['id' => 1]);

        expect(WebhookDelivery::where('success', false)->count())->toBe(1);
    });
});
