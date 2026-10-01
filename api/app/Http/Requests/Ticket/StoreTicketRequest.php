<?php

namespace App\Http\Requests\Ticket;

use Illuminate\Foundation\Http\FormRequest;

class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Ticket::class);
    }

    public function rules(): array
    {
        return [
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:20000'],
            'category_id' => ['nullable', 'integer', 'exists:ticket_categories,id'],
            'priority_id' => ['nullable', 'integer', 'exists:ticket_priorities,id'],
            // Ignored for a customer's own request (they always use their
            // own customer profile); required for staff, who must say
            // which customer the ticket is being created for.
            'customer_id' => [
                $this->user()?->isCustomer() ? 'sometimes' : 'required',
                'integer',
                'exists:customers,id',
            ],
        ];
    }
}
