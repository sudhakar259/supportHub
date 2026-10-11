<?php

namespace App\Http\Requests\Integration;

use App\Support\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreIntegrationTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $tenantId = app(TenantContext::class)->id();

        return [
            'subject' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string', 'max:20000'],
            'category_id' => ['nullable', 'integer', Rule::exists('ticket_categories', 'id')->where('tenant_id', $tenantId)],
            'attachments' => ['sometimes', 'array', 'max:'.config('attachments.max_per_message')],
            'attachments.*' => \App\Support\AttachmentRules::file(),
            'priority_id' => ['nullable', 'integer', Rule::exists('ticket_priorities', 'id')->where('tenant_id', $tenantId)],
            'department_id' => ['nullable', 'integer', Rule::exists('departments', 'id')->where('tenant_id', $tenantId)->where('is_active', true)->whereNull('deleted_at')],
            // Exactly one of these identifies the customer this ticket
            // is for — whichever the caller's own system already has on
            // hand, so it never needs to look up our internal numeric
            // customer id first.
            'customer_id' => ['required_without_all:customer_email,customer_external_id', 'integer', Rule::exists('customers', 'id')->where('tenant_id', $tenantId)],
            'customer_email' => ['required_without_all:customer_id,customer_external_id', 'string', 'email'],
            'customer_external_id' => ['required_without_all:customer_id,customer_email', 'string'],
        ];
    }
}
