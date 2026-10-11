<?php

namespace App\Http\Requests\Ticket;

use App\Support\AttachmentRules;
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
            'attachments' => ['sometimes', 'array', 'max:'.config('attachments.max_per_message')],
            'attachments.*' => AttachmentRules::file(),
        ];
    }
}
