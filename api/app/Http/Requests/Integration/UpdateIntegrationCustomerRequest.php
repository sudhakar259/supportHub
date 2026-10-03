<?php

namespace App\Http\Requests\Integration;

use App\Support\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateIntegrationCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(TenantContext::class)->id();

        return [
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'company_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'customer_type' => ['sometimes', 'string', 'in:individual,business,vip'],
            'external_id' => [
                'sometimes', 'nullable', 'string', 'max:255',
                Rule::unique('customers', 'external_id')->where('tenant_id', $tenantId)->ignore($this->route('customer')),
            ],
        ];
    }
}
