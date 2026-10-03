<?php

namespace App\Http\Requests\Ticket;

use App\Models\Ticket;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Ticket::class);
    }

    public function rules(): array
    {
        $tenantId = $this->user()?->tenant_id;

        return [
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:20000'],
            // Every exists check below is scoped to the caller's own
            // tenant — unscoped, a staff member could set a ticket's
            // category/priority/customer to a row that belongs to a
            // completely different tenant, cross-linking data across
            // the tenant boundary that TenantScope is supposed to
            // enforce everywhere else.
            'category_id' => ['nullable', 'integer', Rule::exists('ticket_categories', 'id')->where('tenant_id', $tenantId)],
            'priority_id' => ['nullable', 'integer', Rule::exists('ticket_priorities', 'id')->where('tenant_id', $tenantId)],
            // Ignored for a customer's own request (they always use their
            // own customer profile); required for staff, who must say
            // which customer the ticket is being created for.
            'customer_id' => [
                $this->user()?->isCustomer() ? 'sometimes' : 'required',
                'integer',
                Rule::exists('customers', 'id')->where('tenant_id', $tenantId),
            ],
        ];
    }
}
