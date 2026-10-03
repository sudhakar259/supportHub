<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            // Optional: disambiguates when the same email has registered
            // with more than one tenant (allowed — email is unique per
            // tenant, not globally). Omitted, login tries every account
            // with that email against the given password and signs in
            // to whichever one actually matches; see AuthController.
            'tenant' => ['sometimes', 'string', 'exists:tenants,slug'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ];
    }
}
