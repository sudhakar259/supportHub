<?php

namespace App\Http\Requests\Priority;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePriorityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('priority'));
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'required', 'string', 'max:255', 'alpha_dash', Rule::unique('ticket_priorities', 'slug')->ignore($this->route('priority'))],
            'level' => ['sometimes', 'required', 'integer', 'min:1', 'max:255'],
            'color' => ['sometimes', 'string', 'max:7'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }
}
