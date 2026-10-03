<?php

namespace App\Http\Requests\Sla;

use App\Models\SlaPolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSlaPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', SlaPolicy::class);
    }

    public function rules(): array
    {
        $tenantId = $this->user()?->tenant_id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            // Scoped per tenant — see StoreTicketRequest for why an
            // unscoped exists check would let an SLA policy reference
            // another tenant's priority/department/business hours.
            'priority_id' => ['nullable', 'integer', Rule::exists('ticket_priorities', 'id')->where('tenant_id', $tenantId)],
            'department_id' => ['nullable', 'integer', Rule::exists('departments', 'id')->where('tenant_id', $tenantId)],
            'business_hours_id' => ['nullable', 'integer', Rule::exists('business_hours', 'id')->where('tenant_id', $tenantId)],
            'first_response_minutes' => ['required', 'integer', 'min:1'],
            'resolution_minutes' => ['required', 'integer', 'min:1'],
            'business_hours_only' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
