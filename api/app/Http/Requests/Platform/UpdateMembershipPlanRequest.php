<?php

namespace App\Http\Requests\Platform;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMembershipPlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => [
                'sometimes', 'required', 'string', 'max:255', 'alpha_dash',
                Rule::unique('membership_plans', 'slug')->ignore($this->route('plan')),
            ],
            'description' => ['nullable', 'string'],
            'price_cents' => ['sometimes', 'required', 'integer', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'billing_interval' => ['sometimes', 'required', 'string', 'in:monthly,yearly'],
            'limits' => ['sometimes', 'array'],
            'limits.*' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
