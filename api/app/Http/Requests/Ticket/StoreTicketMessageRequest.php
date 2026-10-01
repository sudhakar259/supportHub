<?php

namespace App\Http\Requests\Ticket;

use Illuminate\Foundation\Http\FormRequest;

class StoreTicketMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Fine-grained checks happen in the controller via TicketPolicy.
    }

    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:20000'],
            // Staff only — a customer's `is_internal` is always ignored
            // and forced false in the controller, never trusted from input.
            'is_internal' => ['sometimes', 'boolean'],
            'attachments' => ['sometimes', 'array', 'max:5'],
            'attachments.*' => ['file', 'max:25600', 'mimes:jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx,txt,csv,zip'],
        ];
    }
}
