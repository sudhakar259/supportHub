<?php

namespace App\Http\Requests\Integration;

use App\Support\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIntegrationCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authentication/authorization here is entirely
        // credential+scope based (ResolveIntegrationTenantContext +
        // RequireApiScope), not a Sanctum user — there is no
        // $this->user() to consult.
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(TenantContext::class)->id();

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->where('tenant_id', $tenantId)],
            'phone' => ['nullable', 'string', 'max:30'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'customer_type' => ['sometimes', 'string', 'in:individual,business,vip'],
            'external_id' => [
                'nullable', 'string', 'max:255',
                Rule::unique('customers', 'external_id')->where('tenant_id', $tenantId),
            ],
        ];
    }
}
