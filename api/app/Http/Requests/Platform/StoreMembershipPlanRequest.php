<?php

namespace App\Http\Requests\Platform;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMembershipPlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', Rule::unique('membership_plans', 'slug')],
            'description' => ['nullable', 'string'],
            'price_cents' => ['required', 'integer', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'billing_interval' => ['required', 'string', 'in:monthly,yearly'],
            // Null = unlimited for that feature (MembershipPlan::limit()).
            // Not restricted to a fixed key list — PlanLimitService's own
            // match() falls back to 0 usage for a feature it doesn't
            // recognize, so an unrecognized key here is inert, not unsafe.
            'limits' => ['sometimes', 'array'],
            'limits.*' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
