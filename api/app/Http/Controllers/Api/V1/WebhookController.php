<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Webhook\StoreWebhookRequest;
use App\Http\Requests\Webhook\UpdateWebhookRequest;
use App\Http\Resources\WebhookDeliveryResource;
use App\Http\Resources\WebhookResource;
use App\Models\Webhook;
use App\Services\PlanLimitService;
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
     * @bodyParam url string required Must not point to a local/private address. Example: https://example.com/webhooks/supporthub
     * @bodyParam events string[] required One or more of ticket.created, ticket.updated, ticket.assigned, ticket.replied, ticket.status_changed, ticket.resolved, ticket.closed, ticket.reopened. Example: ["ticket.created", "ticket.status_changed"]
     * @bodyParam is_active boolean Defaults to true. Example: true
     *
     * @response 201 {
     *   "success": true, "message": "Webhook created successfully.",
     *   "data": {"id": 1, "name": "Ticket sync", "url": "https://example.com/webhooks/supporthub", "secret": "whsec_..."}
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

        $webhook->update($request->validated());

        return $this->success(new WebhookResource($webhook), 'Webhook updated successfully.');
    }

    /**
     * Delete a webhook
     *
     * @response 200 {"success": true, "message": "Webhook deleted successfully.", "data": null}
     */
    public function destroy(Webhook $webhook): JsonResponse
    {
        $this->authorize('delete', $webhook);

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
