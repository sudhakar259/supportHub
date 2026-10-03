<?php

namespace App\Http\Requests\Status;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('status'));
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => [
                'sometimes', 'required', 'string', 'max:255', 'alpha_dash',
                Rule::unique('ticket_statuses', 'slug')->where('tenant_id', $this->user()->tenant_id)->ignore($this->route('status')),
            ],
            'color' => ['sometimes', 'string', 'max:7'],
            'is_default' => ['sometimes', 'boolean'],
            'is_closed' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
