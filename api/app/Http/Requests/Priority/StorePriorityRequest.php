<?php

namespace App\Http\Requests\Priority;

use App\Models\TicketPriority;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePriorityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', TicketPriority::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            // Scoped per tenant — see StoreStatusRequest for why a bare
            // global unique check is wrong here.
            'slug' => [
                'required', 'string', 'max:255', 'alpha_dash',
                Rule::unique('ticket_priorities', 'slug')->where('tenant_id', $this->user()?->tenant_id),
            ],
            'level' => ['required', 'integer', 'min:1', 'max:255'],
            'color' => ['sometimes', 'string', 'max:7'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
