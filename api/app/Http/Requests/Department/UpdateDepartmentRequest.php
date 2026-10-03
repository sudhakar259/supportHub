<?php

namespace App\Http\Requests\Department;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('department'));
    }

    public function rules(): array
    {
        $department = $this->route('department');
        $tenantId = $this->user()?->tenant_id;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'code' => [
                'sometimes', 'required', 'string', 'max:20', 'alpha_dash',
                Rule::unique('departments', 'code')->where('tenant_id', $tenantId)->ignore($department),
            ],
            'description' => ['nullable', 'string'],
            'manager_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
