<?php

namespace App\Http\Requests\Webhook;

use App\Models\Webhook;
use App\Rules\NotAPrivateUrl;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWebhookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('webhooks.manage');
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'url' => ['sometimes', 'required', 'string', 'url', 'max:2048', new NotAPrivateUrl],
            'events' => ['sometimes', 'array', 'min:1'],
            'events.*' => ['string', Rule::in(Webhook::EVENTS)],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
