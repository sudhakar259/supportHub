<?php

namespace App\Http\Requests\Sla;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSlaPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('policy'));
    }

    public function rules(): array
    {
        $tenantId = $this->user()?->tenant_id;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'priority_id' => ['sometimes', 'nullable', 'integer', Rule::exists('ticket_priorities', 'id')->where('tenant_id', $tenantId)],
            'department_id' => ['sometimes', 'nullable', 'integer', Rule::exists('departments', 'id')->where('tenant_id', $tenantId)],
            'business_hours_id' => ['sometimes', 'nullable', 'integer', Rule::exists('business_hours', 'id')->where('tenant_id', $tenantId)],
            'first_response_minutes' => ['sometimes', 'required', 'integer', 'min:1'],
            'resolution_minutes' => ['sometimes', 'required', 'integer', 'min:1'],
            'business_hours_only' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
