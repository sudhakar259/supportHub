<?php

namespace App\Http\Controllers\Api\V1\Integration;

use App\Http\Controllers\Controller;
use App\Http\Requests\Integration\StoreIntegrationCustomerRequest;
use App\Http\Requests\Integration\UpdateIntegrationCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use App\Models\User;
use App\Services\PlanLimitService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @group Integration API — Customers
 *
 * Authenticated via X-Api-Key / X-Api-Secret headers (see
 * ResolveIntegrationTenantContext), not a Sanctum session — for a
 * tenant's own backend, CRM or chat widget to keep its customer
 * records in sync with this helpdesk. Every endpoint here is scoped to
 * the credential's own tenant; there is no cross-tenant visibility no
 * matter what id is requested.
 *
 * @unauthenticated
 *
 * @header X-Api-Key ak_abcdef1234567890abcdef1234567890
 * @header X-Api-Secret as_abcdef1234567890abcdef1234567890abcdef12345678
 */
class CustomerController extends Controller
{
    /**
     * List customers
     *
     * @queryParam per_page Items per page (max 100). Example: 25
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 4, "external_id": "CRM-001", "company_name": "Acme Corp"}]}
     */
    public function index(Request $request): JsonResponse
    {
        $customers = Customer::with('user')
            ->orderByDesc('id')
            ->paginate(min((int) $request->integer('per_page', 25), 100));

        return $this->success(CustomerResource::collection($customers));
    }

    /**
     * Look up a customer by email or external id
     *
     * @queryParam email string Example: jamie@example.com
     * @queryParam external_id string Example: CRM-001
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": 4, "external_id": "CRM-001"}}
     * @response 404 {"success": false, "message": "No matching customer found."}
     */
    public function lookup(Request $request): JsonResponse
    {
        $request->validate([
            'email' => ['required_without:external_id', 'string', 'email'],
            'external_id' => ['required_without:email', 'string'],
        ]);

        $customer = Customer::with('user')
            ->when($request->filled('external_id'), fn ($q) => $q->where('external_id', $request->string('external_id')))
            ->when($request->filled('email'), fn ($q) => $q->whereHas('user', fn ($uq) => $uq->where('email', $request->string('email'))))
            ->first();

        if (! $customer) {
            return $this->error('No matching customer found.', 404);
        }

        return $this->success(new CustomerResource($customer));
    }

    /**
     * Get a customer
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": 4, "external_id": "CRM-001"}}
     */
    public function show(Customer $customer): JsonResponse
    {
        return $this->success(new CustomerResource($customer->load('user')));
    }

    /**
     * Create a customer
     *
     * No password is set — this customer can request one later via
     * POST /auth/forgot-password if they ever need direct portal
     * access; most integration-created customers never do.
     *
     * @bodyParam name string required Example: Jamie Rivera
     * @bodyParam email string required Unique within this tenant. Example: jamie@example.com
     * @bodyParam phone string Example: +1-555-0100
     * @bodyParam company_name string Example: Acme Corp
     * @bodyParam customer_type string individual, business or vip. Defaults to individual. Example: business
     * @bodyParam external_id string This tenant's own identifier for the customer. Example: CRM-001
     *
     * @response 201 {"success": true, "message": "Customer created successfully.", "data": {"id": 4, "external_id": "CRM-001"}}
     */
    public function store(StoreIntegrationCustomerRequest $request): JsonResponse
    {
        $tenant = app(TenantContext::class)->get();
        app(PlanLimitService::class)->assertCanCreate($tenant, 'customers');

        $customer = DB::transaction(function () use ($request) {
            $user = User::create([
                'name' => $request->string('name'),
                'email' => $request->string('email'),
                'phone' => $request->filled('phone') ? $request->string('phone')->toString() : null,
                'password' => Hash::make(Str::random(40)),
                'is_active' => true,
            ]);

            $user->assignRole('Customer');

            return Customer::create([
                'user_id' => $user->id,
                'company_name' => $request->filled('company_name') ? $request->string('company_name')->toString() : null,
                'customer_type' => $request->input('customer_type', 'individual'),
                'external_id' => $request->filled('external_id') ? $request->string('external_id')->toString() : null,
            ]);
        });

        return $this->created(new CustomerResource($customer->load('user')), 'Customer created successfully.');
    }

    /**
     * Update a customer
     *
     * @bodyParam phone string Example: +1-555-0199
     * @bodyParam company_name string Example: Acme Corporation
     * @bodyParam customer_type string Example: vip
     * @bodyParam external_id string Example: CRM-002
     *
     * @response 200 {"success": true, "message": "Customer updated successfully.", "data": {"id": 4, "external_id": "CRM-002"}}
     */
    public function update(UpdateIntegrationCustomerRequest $request, Customer $customer): JsonResponse
    {
        $customer->update($request->validated());

        return $this->success(new CustomerResource($customer->load('user')), 'Customer updated successfully.');
    }
}
