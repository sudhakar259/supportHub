<?php

namespace App\Http\Requests\Ticket;

use Illuminate\Foundation\Http\FormRequest;

class AssignTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('assign', $this->route('ticket'));
    }

    public function rules(): array
    {
        return [
            'assignee_id' => ['required', 'integer', 'exists:users,id'],
            'department_id' => ['sometimes', 'integer', 'exists:departments,id'],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
