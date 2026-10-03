<?php

namespace App\Http\Requests\Customer;

use App\Models\Customer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Customer::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            // Scoped to the acting admin's own tenant, not globally — the
            // same email may already be a customer of a different
            // tenant (see RegisterRequest, which applies the same rule
            // for self-service signup).
            'email' => [
                'required', 'string', 'email', 'max:255',
                Rule::unique('users', 'email')->where('tenant_id', $this->user()->tenant_id),
            ],
            'password' => ['required', 'confirmed', Password::defaults()],
            'phone' => ['nullable', 'string', 'max:30'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'customer_type' => ['sometimes', 'string', 'in:individual,business,vip'],
            'external_id' => ['nullable', 'string', 'max:255'],
        ];
    }
}
