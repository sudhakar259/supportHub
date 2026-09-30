<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreCustomerRequest;
use App\Http\Requests\Customer\UpdateCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

/**
 * @group Customers
 *
 * Customer profiles. Every customer is backed by a `User` record with
 * the `Customer` role; this resource manages the additional profile
 * fields (company, customer type) layered on top of it.
 */
class CustomerController extends Controller
{
    /**
     * List customers
     *
     * @queryParam filter[customer_type] individual, business or vip. Example: business
     * @queryParam filter[company_name] Partial match. Example: Acme
     * @queryParam sort Sort by created_at. Example: -created_at
     * @queryParam per_page Items per page (max 100). Example: 25
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "company_name": "Acme Corp"}]}
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Customer::class);

        $customers = QueryBuilder::for(Customer::class)
            ->allowedFilters(
                AllowedFilter::exact('customer_type'),
                AllowedFilter::partial('company_name'),
            )
            ->allowedSorts('created_at')
            ->with('user')
            ->defaultSort('-created_at')
            ->paginate(min((int) $request->integer('per_page', 25), 100));

        return $this->success(CustomerResource::collection($customers));
    }

    /**
     * Create a customer (admin-created account)
     *
     * Creates a User with the Customer role plus its Customer profile in
     * a single call, for support staff onboarding a customer by hand.
     * For self-service signup, use POST /auth/register instead.
     *
     * @bodyParam name string required Example: Jamie Rivera
     * @bodyParam email string required Example: jamie@example.com
     * @bodyParam password string required Example: Secret123!
     * @bodyParam password_confirmation string required Example: Secret123!
     * @bodyParam phone string Example: +1-555-0100
     * @bodyParam company_name string Example: Acme Corp
     * @bodyParam customer_type string individual, business or vip. Defaults to individual. Example: business
     *
     * @response 201 {"success": true, "message": "Customer created successfully.", "data": {"id": 4, "company_name": "Acme Corp"}}
     */
    public function store(StoreCustomerRequest $request): JsonResponse
    {
        $customer = DB::transaction(function () use ($request) {
            $user = User::create([
                'name' => $request->string('name'),
                'email' => $request->string('email'),
                'phone' => $request->string('phone') ?: null,
                'password' => Hash::make($request->string('password')),
                'is_active' => true,
            ]);

            $user->assignRole('Customer');

            return Customer::create([
                'user_id' => $user->id,
                'company_name' => $request->string('company_name') ?: null,
                'customer_type' => $request->input('customer_type', 'individual'),
            ]);
        });

        event(new Registered($customer->user));

        return $this->created(new CustomerResource($customer->load('user')), 'Customer created successfully.');
    }

    /**
     * Get a customer
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"id": 1, "company_name": "Acme Corp"}}
     */
    public function show(Customer $customer): JsonResponse
    {
        $this->authorize('view', $customer);

        return $this->success(new CustomerResource($customer->load('user')));
    }

    /**
     * Update a customer
     *
     * @bodyParam phone string Example: +1-555-0199
     * @bodyParam company_name string Example: Acme Corporation
     * @bodyParam customer_type string Example: vip
     *
     * @response 200 {"success": true, "message": "Customer updated successfully.", "data": {"id": 1, "company_name": "Acme Corporation"}}
     */
    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        $customer->update($request->validated());

        return $this->success(new CustomerResource($customer->load('user')), 'Customer updated successfully.');
    }

    /**
     * Delete a customer
     *
     * Soft-deletes the customer profile and the underlying user account.
     * Their tickets are retained for historical reporting.
     *
     * @response 200 {"success": true, "message": "Customer deleted successfully.", "data": null}
     */
    public function destroy(Customer $customer): JsonResponse
    {
        $this->authorize('delete', $customer);

        DB::transaction(function () use ($customer) {
            $customer->delete();
            $customer->user?->delete();
        });

        return $this->deleted('Customer deleted successfully.');
    }
}
