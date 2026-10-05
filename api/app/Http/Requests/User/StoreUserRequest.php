<?php

namespace App\Http\Requests\User;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', User::class);
    }

    public function rules(): array
    {
        $staffRoles = array_keys(array_diff_key(RolesAndPermissionsSeeder::ROLE_PERMISSIONS, ['Customer' => null]));
        $tenantId = $this->user()?->tenant_id;

        return [
            'name' => ['required', 'string', 'max:255'],
            // Scoped to the acting admin's own tenant — see
            // StoreCustomerRequest for why a bare global uniqueness
            // check is wrong once the same email can belong to
            // different tenants' accounts.
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->where('tenant_id', $tenantId)],
            // Optional: when omitted, the controller generates a random
            // password (never returned to the client) and emails the new
            // user a real password-reset link instead — the admin never
            // learns or transmits the new teammate's credential.
            'password' => ['sometimes', 'required', 'confirmed', Password::defaults()],
            'phone' => ['nullable', 'string', 'max:30'],
            'role' => ['required', 'string', 'in:'.implode(',', $staffRoles)],
            'department_ids' => ['sometimes', 'array'],
            // Scoped per tenant — unscoped, a new staff user could be
            // linked to another tenant's department.
            'department_ids.*' => ['integer', Rule::exists('departments', 'id')->where('tenant_id', $tenantId)],
        ];
    }
}
