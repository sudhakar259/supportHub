<?php

namespace App\Services;

use App\Jobs\DeliverWebhookJob;
use App\Models\Tenant;
use App\Models\Webhook;

/**
 * The single place ticket-lifecycle listeners hand off to when
 * something webhook-subscribable happens — mirrors how AuditLogger is
 * the one place audit rows get written. Takes the tenant explicitly
 * (never from TenantContext) because every caller here runs inside a
 * QUEUED notification listener, which has no ambient request context
 * to read.
 */
class WebhookDispatcher
{
    public function dispatch(?Tenant $tenant, string $event, array $payload): void
    {
        if (! $tenant) {
            return;
        }

        Webhook::forTenant($tenant)
            ->where('is_active', true)
            ->get()
            ->each(function (Webhook $webhook) use ($event, $payload) {
                if ($webhook->subscribesTo($event)) {
                    DeliverWebhookJob::dispatch($webhook, $event, $payload);
                }
            });
    }
}
