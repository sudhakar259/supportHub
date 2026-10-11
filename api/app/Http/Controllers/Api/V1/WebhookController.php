<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Webhook\StoreWebhookRequest;
use App\Http\Requests\Webhook\UpdateWebhookRequest;
use App\Http\Resources\WebhookDeliveryResource;
use App\Http\Resources\WebhookResource;
use App\Models\Webhook;
use App\Services\AuditLogger;
use App\Services\PlanLimitService;
use App\Services\WebhookDispatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Webhooks
 *
 * Tenant-configured HTTP callbacks for ticket lifecycle events (see
 * Webhook::EVENTS). Every delivery is signed with the webhook's own
 * secret via an X-Webhook-Signature header (HMAC-SHA256 of the raw
 * JSON body) so the receiving endpoint can verify it actually came
 * from this platform.
 */
class WebhookController extends Controller
{
    /**
     * List webhooks
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "name": "Ticket sync", "url": "https://example.com/hooks", "events": ["ticket.created"]}]}
     */
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Webhook::class);

        return $this->success(WebhookResource::collection(Webhook::orderByDesc('id')->get()));
    }

    /**
     * Create a webhook
     *
     * The secret is returned exactly once, here — it is encrypted at
     * rest and this is the only response that ever includes it in
     * plain text. Use it to verify the X-Webhook-Signature header on
     * each delivery.
     *
     * @bodyParam name string required Example: Ticket sync
     * @bodyParam url string required Must not point to a local/private address. Example: https://example.com/webhooks/deskzeal
     * @bodyParam events string[] required One or more of ticket.created, ticket.updated, ticket.assigned, ticket.replied, ticket.status_changed, ticket.resolved, ticket.closed, ticket.reopened. Example: ["ticket.created", "ticket.status_changed"]
     * @bodyParam is_active boolean Defaults to true. Example: true
     *
     * @response 201 {
     *   "success": true, "message": "Webhook created successfully.",
     *   "data": {"id": 1, "name": "Ticket sync", "url": "https://example.com/webhooks/deskzeal", "secret": "whsec_..."}
     * }
     */
    public function store(StoreWebhookRequest $request): JsonResponse
    {
        app(PlanLimitService::class)->assertCanCreate($request->user()->tenant, 'webhooks');

        $secret = Webhook::generateSecret();

        $webhook = Webhook::create([
            'name' => $request->string('name'),
            'url' => $request->string('url'),
            'secret' => $secret,
            'events' => $request->input('events'),
            'is_active' => $request->boolean('is_active', true),
        ]);

        app(AuditLogger::class)->log('webhook.created', $webhook, null, $webhook->only(['name', 'url', 'events', 'is_active']), $request->user());

        return $this->created(
            array_merge((new WebhookResource($webhook))->resolve($request), ['secret' => $secret]),
            'Webhook created successfully.'
        );
    }

    /**
     * Get a webhook
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": 1, "name": "Ticket sync"}}
     */
    public function show(Webhook $webhook): JsonResponse
    {
        $this->authorize('view', $webhook);

        return $this->success(new WebhookResource($webhook));
    }

    /**
     * Update a webhook
     *
     * @bodyParam name string Example: Ticket sync (v2)
     * @bodyParam url string Example: https://example.com/webhooks/v2
     * @bodyParam events string[] Example: ["ticket.created"]
     * @bodyParam is_active boolean Example: false
     *
     * @response 200 {"success": true, "message": "Webhook updated successfully.", "data": {"id": 1, "name": "Ticket sync (v2)"}}
     */
    public function update(UpdateWebhookRequest $request, Webhook $webhook): JsonResponse
    {
        $this->authorize('update', $webhook);

        $oldValues = $webhook->only(['name', 'url', 'events', 'is_active']);

        $webhook->update($request->validated());

        app(AuditLogger::class)->log('webhook.updated', $webhook, $oldValues, $webhook->only(['name', 'url', 'events', 'is_active']), $request->user());

        return $this->success(new WebhookResource($webhook), 'Webhook updated successfully.');
    }

    /**
     * Rotate a webhook's signing secret
     *
     * Issues a brand-new secret for this webhook; the old one no
     * longer verifies X-Webhook-Signature on any future delivery. Use
     * this instead of deleting and recreating the webhook when only
     * the secret needs to change.
     *
     * @response 200 {
     *   "success": true, "message": "Webhook secret rotated successfully.",
     *   "data": {"id": 1, "name": "Ticket sync", "secret": "whsec_..."}
     * }
     */
    public function rotateSecret(Request $request, Webhook $webhook): JsonResponse
    {
        $this->authorize('update', $webhook);

        $secret = Webhook::generateSecret();

        $webhook->update(['secret' => $secret]);

        app(AuditLogger::class)->log('webhook.secret_rotated', $webhook, null, null, $request->user());

        return $this->success(
            array_merge((new WebhookResource($webhook))->resolve($request), ['secret' => $secret]),
            'Webhook secret rotated successfully.'
        );
    }

    /**
     * Send a test event to a webhook
     *
     * Delivers a synthetic `webhook.test` event to this webhook's URL
     * right away (not queued, never retried) so its endpoint and
     * signature verification can be checked without waiting for a
     * real ticket event. The attempt is still recorded as an ordinary
     * delivery, visible via GET /webhooks/{webhook}/deliveries.
     *
     * @response 200 {
     *   "success": true, "message": "Test webhook sent.",
     *   "data": {"id": 9, "event": "webhook.test", "response_status": 200, "success": true}
     * }
     */
    public function test(Webhook $webhook): JsonResponse
    {
        $this->authorize('update', $webhook);

        $delivery = app(WebhookDispatcher::class)->test($webhook);

        return $this->success(new WebhookDeliveryResource($delivery), 'Test webhook sent.');
    }

    /**
     * Delete a webhook
     *
     * @response 200 {"success": true, "message": "Webhook deleted successfully.", "data": null}
     */
    public function destroy(Request $request, Webhook $webhook): JsonResponse
    {
        $this->authorize('delete', $webhook);

        app(AuditLogger::class)->log('webhook.deleted', $webhook, $webhook->only(['name', 'url', 'events']), null, $request->user());

        $webhook->delete();

        return $this->deleted('Webhook deleted successfully.');
    }

    /**
     * List a webhook's recent delivery attempts
     *
     * @queryParam per_page Items per page (max 100). Example: 25
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "event": "ticket.created", "success": true, "response_status": 200}]}
     */
    public function deliveries(Request $request, Webhook $webhook): JsonResponse
    {
        $this->authorize('view', $webhook);

        $deliveries = $webhook->deliveries()
            ->orderByDesc('id')
            ->paginate(min((int) $request->integer('per_page', 25), 100));

        return $this->success(WebhookDeliveryResource::collection($deliveries));
    }
}
