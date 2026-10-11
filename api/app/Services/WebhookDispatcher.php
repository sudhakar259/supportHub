<?php

namespace App\Services;

use App\Jobs\DeliverWebhookJob;
use App\Models\Tenant;
use App\Models\Webhook;
use App\Models\WebhookDelivery;
use Illuminate\Support\Facades\Http;

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
                if (! $webhook->subscribesTo($event)) {
                    return;
                }

                // Under a synchronous queue the job runs inline and rethrows a failed
                // delivery; the attempt is already logged, so the failure must not
                // fail the request that caused the ticket event.
                try {
                    DeliverWebhookJob::dispatch($webhook, $event, $payload);
                } catch (\Throwable $e) {
                    report($e);
                }
            });
    }

    /**
     * One-shot, synchronous delivery of a synthetic "webhook.test" event
     * so a tenant can verify its endpoint/signature handling without
     * waiting for a real ticket event — section 36. Unlike
     * DeliverWebhookJob this never queues or retries: the caller gets
     * the outcome of this single attempt back immediately, and it's
     * still recorded as an ordinary WebhookDelivery row so it shows up
     * alongside real deliveries in the log.
     */
    public function test(Webhook $webhook): WebhookDelivery
    {
        $payload = [
            'message' => 'This is a test event from DeskNu.',
            'webhook_id' => $webhook->id,
        ];

        $body = [
            'event' => 'webhook.test',
            'data' => $payload,
            'timestamp' => now()->toIso8601String(),
        ];

        $signature = $webhook->sign(json_encode($body));

        try {
            $response = Http::withHeaders([
                'X-Webhook-Signature' => $signature,
                'X-Webhook-Event' => 'webhook.test',
            ])->timeout(10)->post($webhook->url, $body);

            $status = $response->status();
            $responseBody = $response->body();
            $success = $response->successful();
        } catch (\Throwable $e) {
            $status = 0;
            $responseBody = $e->getMessage();
            $success = false;
        }

        return WebhookDelivery::create([
            'tenant_id' => $webhook->tenant_id,
            'webhook_id' => $webhook->id,
            'event' => 'webhook.test',
            'payload' => $payload,
            'response_status' => $status,
            'response_body' => $responseBody !== null ? substr($responseBody, 0, 2000) : null,
            'success' => $success,
            'attempt' => 1,
            'attempted_at' => now(),
        ]);
    }
}
