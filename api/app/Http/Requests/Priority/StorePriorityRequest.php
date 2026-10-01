<?php

namespace App\Http\Requests\Priority;

use App\Models\TicketPriority;
use Illuminate\Foundation\Http\FormRequest;

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
            'slug' => ['required', 'string', 'max:255', 'alpha_dash', 'unique:ticket_priorities,slug'],
            'level' => ['required', 'integer', 'min:1', 'max:255'],
            'color' => ['sometimes', 'string', 'max:7'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
