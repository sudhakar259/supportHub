<?php

namespace App\Http\Requests\TicketNumberSetting;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTicketNumberSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('settings.manage');
    }

    public function rules(): array
    {
        $tenantId = $this->user()?->tenant_id;

        return [
            // Omitted/null => the tenant's global default. Scoped to the
            // acting admin's own tenant, same reasoning as every other
            // tenant-scoped foreign key check in this app.
            'department_id' => ['nullable', 'integer', Rule::exists('departments', 'id')->where('tenant_id', $tenantId)],
            'prefix' => ['required', 'string', 'max:20'],
            // Supports {prefix} {number} {year} {month} {day} {department}
            // {department_code} — see GenerateTicketNumberAction::format().
            'format' => ['required', 'string', 'max:255'],
            'starting_number' => ['required', 'integer', 'min:1'],
            'number_length' => ['required', 'integer', 'min:1', 'max:20'],
            'reset_period' => ['required', 'string', Rule::in(['never', 'yearly', 'monthly', 'daily'])],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
