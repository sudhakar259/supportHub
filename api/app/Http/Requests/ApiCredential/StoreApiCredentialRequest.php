<?php

namespace App\Http\Requests\ApiCredential;

use App\Models\ApiCredential;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreApiCredentialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('api-credentials.create');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'scopes' => ['required', 'array', 'min:1'],
            'scopes.*' => ['string', Rule::in(ApiCredential::ALL_SCOPES)],
        ];
    }
}
