<?php

namespace App\Jobs;

use App\Exceptions\WebhookDeliveryFailedException;
use App\Models\Webhook;
use App\Models\WebhookDelivery;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;

/**
 * One HTTP delivery attempt to one webhook endpoint. Laravel's own
 * retry/backoff (not a manual release() loop) drives re-attempts —
 * throwing on anything but a 2xx response re-queues this same job up
 * to $tries times, and each attempt (success or failure) gets its own
 * WebhookDelivery row via logDelivery(), so the full retry history is
 * visible, not just the final outcome.
 */
class DeliverWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    /**
     * @var array<int, int>
     */
    public array $backoff = [10, 60, 300, 900];

    public function __construct(
        public Webhook $webhook,
        public string $event,
        public array $payload,
    ) {}

    public function handle(): void
    {
        $body = [
            'event' => $this->event,
            'data' => $this->payload,
            'timestamp' => now()->toIso8601String(),
        ];

        $signature = $this->webhook->sign(json_encode($body));

        try {
            $response = Http::withHeaders([
                'X-Webhook-Signature' => $signature,
                'X-Webhook-Event' => $this->event,
            ])->timeout(10)->post($this->webhook->url, $body);

            $status = $response->status();
            $responseBody = $response->body();
            $success = $response->successful();
        } catch (\Throwable $e) {
            $status = 0;
            $responseBody = $e->getMessage();
            $success = false;
        }

        $this->logDelivery($status, $responseBody, $success);

        if (! $success) {
            throw new WebhookDeliveryFailedException("Webhook delivery to {$this->webhook->url} failed (status {$status}).");
        }

        $this->webhook->forceFill(['last_triggered_at' => now()])->saveQuietly();
    }

    private function logDelivery(int $status, ?string $body, bool $success): void
    {
        WebhookDelivery::create([
            'tenant_id' => $this->webhook->tenant_id,
            'webhook_id' => $this->webhook->id,
            'event' => $this->event,
            'payload' => $this->payload,
            'response_status' => $status,
            'response_body' => $body !== null ? substr($body, 0, 2000) : null,
            'success' => $success,
            'attempt' => $this->attempts(),
            'attempted_at' => now(),
        ]);
    }
}
