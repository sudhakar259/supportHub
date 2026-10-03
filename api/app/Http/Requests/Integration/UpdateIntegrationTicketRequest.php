<?php

namespace App\Http\Requests\Integration;

use App\Support\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateIntegrationTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(TenantContext::class)->id();

        return [
            'subject' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'required', 'string', 'max:20000'],
            'category_id' => ['sometimes', 'nullable', 'integer', Rule::exists('ticket_categories', 'id')->where('tenant_id', $tenantId)],
            'priority_id' => ['sometimes', 'integer', Rule::exists('ticket_priorities', 'id')->where('tenant_id', $tenantId)],
        ];
    }
}
