<?php

namespace App\Http\Requests\ApiCredential;

use App\Models\ApiCredential;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateApiCredentialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('api-credentials.update');
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'scopes' => ['sometimes', 'array', 'min:1'],
            'scopes.*' => ['string', Rule::in(ApiCredential::ALL_SCOPES)],
        ];
    }
}
