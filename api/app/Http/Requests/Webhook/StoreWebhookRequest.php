<?php

namespace App\Http\Requests\Webhook;

use App\Models\Webhook;
use App\Rules\NotAPrivateUrl;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWebhookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('webhooks.manage');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'url' => ['required', 'string', 'url', 'max:2048', new NotAPrivateUrl],
            'events' => ['required', 'array', 'min:1'],
            'events.*' => ['string', Rule::in(Webhook::EVENTS)],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
