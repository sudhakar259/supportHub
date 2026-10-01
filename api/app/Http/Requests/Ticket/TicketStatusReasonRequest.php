<?php

namespace App\Http\Requests\Ticket;

use Illuminate\Foundation\Http\FormRequest;

class TicketStatusReasonRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // The specific ability (escalate/resolve/close/reopen) is checked in the controller.
    }

    public function rules(): array
    {
        return [
            'reason' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
