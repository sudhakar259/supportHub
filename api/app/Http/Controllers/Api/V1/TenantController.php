<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tenant\RegisterTenantRequest;
use App\Http\Resources\TenantResource;
use App\Http\Resources\UserResource;
use App\Models\MembershipPlan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioningService;
use App\Support\TenantContext;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * @group Tenant Registration
 *
 * Self-service signup for a brand-new organization, distinct from
 * /auth/register (which adds a Customer to an *existing* tenant's
 * helpdesk). This flow creates the tenant itself, its first
 * subscription and its first user — the Tenant Owner, who lands with
 * the full-access "Administrator" role for that tenant only.
 */
class TenantController extends Controller
{
    /**
     * Register a new organization
     *
     * Creates the tenant, subscribes it to the given plan (the free
     * Starter plan if omitted), provisions its default roles/ticket
     * statuses/priorities, and creates the owner account. Starter-plan
     * signups are active immediately; any paid plan starts a 14-day
     * trial (no payment is collected here — billing integration is out
     * of scope for this API).
     *
     * @unauthenticated
     *
     * @bodyParam tenant_name string required The organization's display name. Example: Acme Corp
     * @bodyParam tenant_slug string required Globally unique, used in the `tenant` field of /auth/login and /auth/register. Example: acme-corp
     * @bodyParam owner_name string required Example: Jamie Rivera
     * @bodyParam owner_email string required Example: jamie@acme.com
     * @bodyParam owner_password string required Minimum 10 characters, including upper and lower case, a number, and a symbol. Example: Secret123!word$9
     * @bodyParam owner_password_confirmation string required Must match owner_password. Example: Secret123!word$9
     * @bodyParam plan string The membership plan slug. Defaults to "starter". Example: professional
     * @bodyParam phone string Example: +1-555-0100
     * @bodyParam website string Example: https://acme.com
     * @bodyParam country string ISO 3166-1 alpha-2. Example: US
     * @bodyParam timezone string Example: America/New_York
     *
     * @response 201 {
     *   "success": true,
     *   "message": "Organization registered successfully.",
     *   "data": {
     *     "tenant": {"id": 7, "name": "Acme Corp", "slug": "acme-corp", "status": "active"},
     *     "user": {"id": 42, "name": "Jamie Rivera", "email": "jamie@acme.com", "roles": ["Administrator"]},
     *     "token": "1|abcdef123456...",
     *     "token_type": "Bearer"
     *   }
     * }
     * @response 422 {
     *   "success": false,
     *   "message": "Validation failed.",
     *   "errors": {"tenant_slug": ["The tenant slug has already been taken."]}
     * }
     */
    public function register(RegisterTenantRequest $request): JsonResponse
    {
        $plan = MembershipPlan::where('slug', $request->string('plan')->toString() ?: 'starter')
            ->where('is_active', true)
            ->firstOrFail();

        $isFree = $plan->price_cents === 0;

        [$tenant, $owner] = DB::transaction(function () use ($request, $plan, $isFree) {
            $tenant = Tenant::create([
                'name' => $request->string('tenant_name'),
                'slug' => $request->string('tenant_slug'),
                'status' => $isFree ? 'active' : 'trial',
                'email' => $request->string('owner_email'),
                'phone' => $request->filled('phone') ? $request->string('phone')->toString() : null,
                'website' => $request->filled('website') ? $request->string('website')->toString() : null,
                'country' => $request->filled('country') ? $request->string('country')->toString() : null,
                'timezone' => $request->filled('timezone') ? $request->string('timezone')->toString() : 'UTC',
                'trial_ends_at' => $isFree ? null : now()->addDays(14),
            ]);

            $owner = app(TenantContext::class)->runAs($tenant, function () use ($tenant, $request, $plan) {
                app(TenantProvisioningService::class)->provision($tenant);

                Subscription::create([
                    'tenant_id' => $tenant->id,
                    'membership_plan_id' => $plan->id,
                    'status' => $tenant->status,
                    'trial_ends_at' => $tenant->trial_ends_at,
                    // No billing cycle has started yet in either case: a
                    // free plan has none to track, and a paid plan's
                    // first period only begins once the trial converts
                    // (billing integration is out of scope here).
                    'current_period_ends_at' => null,
                ]);

                $owner = User::create([
                    'tenant_id' => $tenant->id,
                    'name' => $request->string('owner_name'),
                    'email' => $request->string('owner_email'),
                    'password' => Hash::make($request->string('owner_password')),
                    'is_active' => true,
                ]);

                $owner->assignRole('Administrator');

                return $owner;
            });

            return [$tenant, $owner];
        });

        event(new Registered($owner));

        $token = $owner->createToken($request->string('device_name')->toString() ?: 'api')->plainTextToken;

        // The owner's "Administrator" role was assigned inside runAs($tenant, ...)
        // above, which restores TenantContext (and spatie's team id with it) once
        // that closure returns — load('roles') out here would otherwise compare
        // against the wrong team id and come back empty, same bug as AuthController.
        app(TenantContext::class)->set($tenant);

        return $this->created([
            'tenant' => new TenantResource($tenant),
            'user' => new UserResource($owner->load(['roles', 'tenant'])),
            'token' => $token,
            'token_type' => 'Bearer',
        ], 'Organization registered successfully.');
    }

    /**
     * Look up an organization by slug
     *
     * Used by login/registration clients to confirm a tenant slug
     * exists and is currently accepting sign-ins before prompting for
     * credentials. Deliberately returns only non-sensitive fields.
     *
     * @unauthenticated
     *
     * @urlParam slug string required Example: acme-corp
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"slug": "acme-corp", "name": "Acme Corp", "is_active": true}}
     * @response 404 {"success": false, "message": "No organization found for that identifier."}
     */
    public function lookup(string $slug): JsonResponse
    {
        // Availability only. Returning the name or status would let anyone list
        // customer organizations by slug.
        return $this->success([
            'available' => \App\Support\WorkspaceDomains::validSlug($slug) && ! Tenant::where('slug', $slug)->exists(),
        ]);
    }
}
