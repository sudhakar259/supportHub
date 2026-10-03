<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApiCredential\StoreApiCredentialRequest;
use App\Http\Requests\ApiCredential\UpdateApiCredentialRequest;
use App\Http\Resources\ApiCredentialResource;
use App\Models\ApiCredential;
use App\Services\AuditLogger;
use App\Services\PlanLimitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * @group API Credentials
 *
 * Key+secret pairs a tenant issues to its own backend/CRM/chat widget
 * to call the Integration API (see docs under "Integration API —
 * Customers/Tickets"). Scoped to the caller's own tenant like
 * everything else here; a credential's secret is only ever visible in
 * the response to the single store()/rotate() call that generated it.
 */
class ApiCredentialController extends Controller
{
    /**
     * List API credentials
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "name": "Chat widget", "key": "ak_...", "status": "active"}]}
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ApiCredential::class);

        return $this->success(ApiCredentialResource::collection(
            ApiCredential::with('creator')->orderByDesc('id')->get()
        ));
    }

    /**
     * Create an API credential
     *
     * The secret is returned exactly once, here — it is hashed at
     * rest and cannot be recovered afterward. Store it securely; if
     * it's lost, rotate the credential for a new one.
     *
     * @bodyParam name string required Example: Chat widget
     * @bodyParam scopes string[] required One or more of customers.read, customers.create, customers.update, tickets.read, tickets.create, tickets.update, tickets.reply, tickets.status.update, tickets.attachments. Example: ["customers.read", "tickets.create"]
     *
     * @response 201 {
     *   "success": true, "message": "API credential created successfully.",
     *   "data": {"id": 1, "name": "Chat widget", "key": "ak_abc123...", "secret": "as_def456...", "scopes": ["customers.read"]}
     * }
     */
    public function store(StoreApiCredentialRequest $request): JsonResponse
    {
        app(PlanLimitService::class)->assertCanCreate($request->user()->tenant, 'api_credentials');

        $pair = ApiCredential::generateCredentialPair();

        $credential = ApiCredential::create([
            'name' => $request->string('name'),
            'key' => $pair['key'],
            'secret_hash' => Hash::make($pair['secret']),
            'secret_last_four' => substr($pair['secret'], -4),
            'scopes' => $request->input('scopes'),
            'status' => 'active',
            'created_by' => $request->user()->id,
        ]);

        app(AuditLogger::class)->log('api_credential.created', $credential, null, ['name' => $credential->name, 'scopes' => $credential->scopes], $request->user());

        return $this->created(
            array_merge((new ApiCredentialResource($credential))->resolve($request), ['secret' => $pair['secret']]),
            'API credential created successfully.'
        );
    }

    /**
     * Get an API credential
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": 1, "name": "Chat widget"}}
     */
    public function show(ApiCredential $credential): JsonResponse
    {
        $this->authorize('view', $credential);

        return $this->success(new ApiCredentialResource($credential->load('creator')));
    }

    /**
     * Update an API credential's name or scopes
     *
     * @bodyParam name string Example: Chat widget (prod)
     * @bodyParam scopes string[] Example: ["customers.read"]
     *
     * @response 200 {"success": true, "message": "API credential updated successfully.", "data": {"id": 1, "name": "Chat widget (prod)"}}
     */
    public function update(UpdateApiCredentialRequest $request, ApiCredential $credential): JsonResponse
    {
        $this->authorize('update', $credential);

        $credential->update($request->validated());

        return $this->success(new ApiCredentialResource($credential), 'API credential updated successfully.');
    }

    /**
     * Rotate an API credential's secret
     *
     * Issues a brand-new secret for the same key; the old secret
     * stops working immediately. Use this instead of revoking +
     * recreating when only the secret (not the whole credential and
     * its scopes/history) needs to change.
     *
     * @response 200 {"success": true, "message": "Secret rotated successfully.", "data": {"id": 1, "key": "ak_abc123...", "secret": "as_newsecret..."}}
     */
    public function rotate(Request $request, ApiCredential $credential): JsonResponse
    {
        $this->authorize('update', $credential);

        $pair = ApiCredential::generateCredentialPair();

        $credential->update([
            'secret_hash' => Hash::make($pair['secret']),
            'secret_last_four' => substr($pair['secret'], -4),
        ]);

        app(AuditLogger::class)->log('api_credential.secret_rotated', $credential, null, null, $request->user());

        return $this->success(
            array_merge((new ApiCredentialResource($credential))->resolve($request), ['secret' => $pair['secret']]),
            'Secret rotated successfully.'
        );
    }

    /**
     * Revoke an API credential
     *
     * Immediately and permanently stops this credential from
     * authenticating. Cannot be undone — issue a new credential
     * instead of expecting this one to work again.
     *
     * @response 200 {"success": true, "message": "API credential revoked successfully.", "data": {"id": 1, "status": "revoked"}}
     */
    public function revoke(Request $request, ApiCredential $credential): JsonResponse
    {
        $this->authorize('delete', $credential);

        $credential->update(['status' => 'revoked', 'revoked_at' => now()]);

        app(AuditLogger::class)->log('api_credential.revoked', $credential, null, null, $request->user());

        return $this->success(new ApiCredentialResource($credential), 'API credential revoked successfully.');
    }
}
