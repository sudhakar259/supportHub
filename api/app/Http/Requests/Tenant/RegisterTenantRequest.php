<?php

namespace App\Http\Requests\Tenant;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tenant_name' => ['required', 'string', 'max:255'],
            // Globally unique on purpose, unlike a customer's email —
            // the slug is how a tenant is addressed before any
            // authenticated identity exists (login/register `tenant`
            // field, GET /tenants/lookup/{slug}).
            'tenant_slug' => ['required', 'string', 'max:63', 'regex:/\A[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\z/', Rule::notIn(config('workspaces.reserved')), Rule::unique('tenants', 'slug')],
            'owner_name' => ['required', 'string', 'max:255'],
            'owner_email' => ['required', 'string', 'email', 'max:255'],
            'owner_password' => ['required', 'confirmed', Password::defaults()],
            // Defaults to the free Starter plan in the controller when
            // omitted, so a bare-minimum signup still works.
            'plan' => ['sometimes', 'string', Rule::exists('membership_plans', 'slug')->where('is_active', true)],
            'phone' => ['nullable', 'string', 'max:30'],
            'website' => ['nullable', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:2'],
            'timezone' => ['nullable', 'string', 'max:64'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ];
    }
}
