<?php

namespace App\Http\Requests\Ticket;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('ticket'));
    }

    public function rules(): array
    {
        return [
            'subject' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string', 'max:20000'],
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:ticket_categories,id'],
            'priority_id' => ['sometimes', 'integer', 'exists:ticket_priorities,id'],
        ];
    }
}
