<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class ForgotPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            // Optional, same reason as LoginRequest's: the same email
            // may be a different account in each of several tenants.
            // Omitted, AuthController resolves whichever account that
            // email matches first — see its docblock for why that's an
            // acceptable default but specifying this is the safer path
            // once more than one tenant shares an email.
            'tenant' => ['sometimes', 'string', 'exists:tenants,slug'],
        ];
    }
}
