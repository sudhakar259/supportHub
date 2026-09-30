<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('customer'));
    }

    public function rules(): array
    {
        return [
            // The customer's name/email live on the related User record —
            // update those via PUT /users/{user} instead.
            'phone' => ['nullable', 'string', 'max:30'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'customer_type' => ['sometimes', 'string', 'in:individual,business,vip'],
            'timezone' => ['sometimes', 'string', 'max:64'],
        ];
    }
}
