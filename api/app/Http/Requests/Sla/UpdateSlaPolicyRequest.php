<?php

namespace App\Http\Requests\Sla;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSlaPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('policy'));
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'priority_id' => ['sometimes', 'nullable', 'integer', 'exists:ticket_priorities,id'],
            'department_id' => ['sometimes', 'nullable', 'integer', 'exists:departments,id'],
            'business_hours_id' => ['sometimes', 'nullable', 'integer', 'exists:business_hours,id'],
            'first_response_minutes' => ['sometimes', 'required', 'integer', 'min:1'],
            'resolution_minutes' => ['sometimes', 'required', 'integer', 'min:1'],
            'business_hours_only' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
