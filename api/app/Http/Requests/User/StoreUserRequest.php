<?php

namespace App\Http\Requests\User;

use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\User::class);
    }

    public function rules(): array
    {
        $staffRoles = array_keys(array_diff_key(RolesAndPermissionsSeeder::ROLE_PERMISSIONS, ['Customer' => null]));

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'phone' => ['nullable', 'string', 'max:30'],
            'role' => ['required', 'string', 'in:'.implode(',', $staffRoles)],
            'department_ids' => ['sometimes', 'array'],
            'department_ids.*' => ['integer', 'exists:departments,id'],
        ];
    }
}
