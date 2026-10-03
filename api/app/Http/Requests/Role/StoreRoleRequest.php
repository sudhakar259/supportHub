<?php

namespace App\Http\Requests\Role;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Role::class);
    }

    public function rules(): array
    {
        return [
            // Scoped to the acting admin's own tenant — role names like
            // "Agent" are reused by every tenant (one role ROW each,
            // per spatie's teams feature), so a bare global uniqueness
            // check would reject names already taken by some other,
            // unrelated tenant.
            'name' => [
                'required', 'string', 'max:255',
                Rule::unique('roles', 'name')->where('tenant_id', $this->user()->tenant_id),
            ],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ];
    }
}
