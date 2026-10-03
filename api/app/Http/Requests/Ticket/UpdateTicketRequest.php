<?php

namespace App\Http\Requests\Ticket;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('ticket'));
    }

    public function rules(): array
    {
        $tenantId = $this->user()?->tenant_id;

        return [
            'subject' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string', 'max:20000'],
            'category_id' => ['sometimes', 'nullable', 'integer', Rule::exists('ticket_categories', 'id')->where('tenant_id', $tenantId)],
            'priority_id' => ['sometimes', 'integer', Rule::exists('ticket_priorities', 'id')->where('tenant_id', $tenantId)],
        ];
    }
}
