<?php

namespace App\Http\Requests\Auth;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Which tenant's helpdesk this customer is registering for —
            // there is no authenticated identity yet at this point in
            // the request to derive it from any other way (unlike every
            // other tenant-scoped endpoint, which resolves it from the
            // caller's own account; see docs/multi-tenancy.md).
            'tenant' => ['required', 'string', Rule::exists('tenants', 'slug')],
            'name' => ['required', 'string', 'max:255'],
            // Not globally unique — email is unique per (tenant, email),
            // so the same address can register with several tenants'
            // helpdesks independently. The actual DB constraint is
            // checked again in withValidator() below once the tenant is
            // resolved, since a plain unique:users,email rule can't
            // express the composite key.
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'phone' => ['nullable', 'string', 'max:30'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if (! $this->filled('tenant') || ! $this->filled('email')) {
                return;
            }

            $tenant = Tenant::where('slug', $this->input('tenant'))->first();

            if ($tenant && ! $tenant->isActive()) {
                $validator->errors()->add('tenant', 'This organization is not currently accepting new registrations.');

                return;
            }

            if ($tenant && User::where('tenant_id', $tenant->id)->where('email', $this->input('email'))->exists()) {
                $validator->errors()->add('email', 'An account with this email already exists for this organization.');
            }
        });
    }
}
