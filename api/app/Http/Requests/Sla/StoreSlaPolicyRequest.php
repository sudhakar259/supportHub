<?php

namespace App\Http\Requests\Sla;

use App\Models\SlaPolicy;
use Illuminate\Foundation\Http\FormRequest;

class StoreSlaPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', SlaPolicy::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'priority_id' => ['nullable', 'integer', 'exists:ticket_priorities,id'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'business_hours_id' => ['nullable', 'integer', 'exists:business_hours,id'],
            'first_response_minutes' => ['required', 'integer', 'min:1'],
            'resolution_minutes' => ['required', 'integer', 'min:1'],
            'business_hours_only' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
