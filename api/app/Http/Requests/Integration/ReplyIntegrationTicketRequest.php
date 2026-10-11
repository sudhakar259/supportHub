<?php

namespace App\Http\Requests\Integration;

use App\Support\AttachmentRules;
use Illuminate\Foundation\Http\FormRequest;

class ReplyIntegrationTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:20000'],
            'attachments' => ['sometimes', 'array', 'max:'.config('attachments.max_per_message')],
            'attachments.*' => AttachmentRules::file(),
        ];
    }
}
