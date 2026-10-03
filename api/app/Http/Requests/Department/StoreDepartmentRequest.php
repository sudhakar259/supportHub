<?php

namespace App\Http\Requests\Department;

use App\Models\Department;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Department::class);
    }

    public function rules(): array
    {
        $tenantId = $this->user()?->tenant_id;

        return [
            'name' => ['required', 'string', 'max:255'],
            // Scoped per tenant — two tenants may both want code "BILL".
            'code' => [
                'required', 'string', 'max:20', 'alpha_dash',
                Rule::unique('departments', 'code')->where('tenant_id', $tenantId),
            ],
            'description' => ['nullable', 'string'],
            'manager_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
