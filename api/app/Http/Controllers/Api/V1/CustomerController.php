<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreCustomerRequest;
use App\Http\Requests\Customer\UpdateCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\CustomerDataService;
use App\Services\PlanLimitService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
     * @bodyParam external_id string This tenant's own identifier for the customer (CRM id, account number, etc.), unique within this tenant. Example: CRM-10293
     *
     * @response 201 {"success": true, "message": "Customer created successfully.", "data": {"id": 4, "company_name": "Acme Corp"}}
     */
    public function store(StoreCustomerRequest $request): JsonResponse
    {
        app(PlanLimitService::class)->assertCanCreate($request->user()->tenant, 'customers');

        $customer = DB::transaction(function () use ($request) {
            $user = User::create([
                'name' => $request->string('name'),
                'email' => $request->string('email'),
                'phone' => $request->filled('phone') ? $request->string('phone')->toString() : null,
                'password' => Hash::make($request->string('password')),
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

        event(new Registered($customer->user));

        app(AuditLogger::class)->log('customer.created', $customer, null, $customer->only(['company_name', 'customer_type', 'external_id']), $request->user());

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
     * @bodyParam external_id string Example: CRM-10293
     *
     * @response 200 {"success": true, "message": "Customer updated successfully.", "data": {"id": 1, "company_name": "Acme Corporation"}}
     */
    public function update(UpdateCustomerRequest $request, Customer $customer): JsonResponse
    {
        $data = $request->validated();

        // customer_type (individual/business/vip) feeds routing-rule
        // conditions, and external_id is how the Integration API maps
        // this record to the tenant's own system — both are
        // staff-controlled only; a customer updating their own profile
        // must not be able to self-escalate the former or collide/
        // disconnect the latter (mirrors how TicketController::update()
        // strips priority_id for customers). CustomerPolicy::update()
        // permits self-service for the rest of this payload
        // (phone/company_name/timezone).
        if (! $request->user()->can('customers.update')) {
            unset($data['customer_type'], $data['external_id']);
        }

        $customer->update($data);

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

    /**
     * Export a customer's data
     *
     * Downloads a JSON copy of everything held about this customer (profile, tickets,
     * messages, attachment names, emails sent to them) to answer a data-access request.
     * Internal staff notes are left out. Requires `customers.export`.
     *
     * @urlParam customer integer required Example: 4
     *
     * @response 200 scenario="JSON file download" {"generated_at": "2026-10-11T10:00:00+00:00", "customer": {"name": "Jamie Rivera", "email": "jamie@example.com"}, "tickets": []}
     */
    public function export(Request $request, Customer $customer, CustomerDataService $data): StreamedResponse
    {
        $this->authorize('export', $customer);

        app(AuditLogger::class)->log('customer.exported', $customer, null, null, $request->user());

        $filename = 'customer-'.$customer->id.'-data-'.now()->format('Ymd').'.json';

        return response()->streamDownload(
            fn () => print json_encode($data->export($customer), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            $filename,
            ['Content-Type' => 'application/json'],
        );
    }

    /**
     * Erase a customer's personal data
     *
     * **Irreversible.** Anonymizes the customer everywhere their identity is stored (account,
     * customer record, audit entries, the inbound-email log) and signs them out. With
     * `redact_content` (the default) it also removes the text of their tickets, every message
     * and all attachments; with `false` the ticket text is kept for your records and only the
     * person stops being identifiable. Requires `customers.erase`, and the customer's email
     * typed back as confirmation.
     *
     * @urlParam customer integer required Example: 4
     *
     * @bodyParam confirm_email string required The customer's current email address, to confirm this is the right person. Example: jamie@example.com
     * @bodyParam redact_content boolean Also remove ticket text, messages and attachments. Defaults to true. Example: true
     *
     * @response 200 {"success": true, "message": "Customer data erased.", "data": {"tickets": 3, "messages_redacted": 11, "attachments_removed": 2, "redacted_content": true}}
     * @response 422 {"success": false, "message": "Validation failed.", "errors": {"confirm_email": ["The email does not match this customer."]}}
     */
    public function erase(Request $request, Customer $customer, CustomerDataService $data): JsonResponse
    {
        $this->authorize('erase', $customer);

        $validated = $request->validate([
            'confirm_email' => ['required', 'string'],
            'redact_content' => ['sometimes', 'boolean'],
        ]);

        if (strtolower(trim($validated['confirm_email'])) !== strtolower((string) $customer->user?->email)) {
            throw ValidationException::withMessages(['confirm_email' => ['The email does not match this customer.']]);
        }

        $summary = $data->erase($customer, $request->boolean('redact_content', true), $request->user());

        return $this->success($summary, 'Customer data erased.');
    }
}
