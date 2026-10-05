<?php

namespace App\Http\Requests\Status;

use App\Models\TicketStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', TicketStatus::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            // Scoped to the acting admin's own tenant — every tenant
            // gets its own "open"/"closed"/etc. slugs from provisioning,
            // so a bare global uniqueness check would make those common
            // slugs permanently unusable for every tenant after the first.
            'slug' => [
                'required', 'string', 'max:255', 'alpha_dash',
                Rule::unique('ticket_statuses', 'slug')->where('tenant_id', $this->user()?->tenant_id),
            ],
            'color' => ['sometimes', 'string', 'max:7'],
            'is_default' => ['sometimes', 'boolean'],
            'is_closed' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
