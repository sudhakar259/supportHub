<?php

namespace App\Http\Requests\Subscription;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSubscriptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('billing.manage');
    }

    public function rules(): array
    {
        return [
            'plan' => ['required', 'string', Rule::exists('membership_plans', 'slug')->where('is_active', true)],
        ];
    }
}
