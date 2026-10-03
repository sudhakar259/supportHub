<?php

namespace App\Http\Requests\Category;

use App\Models\TicketCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StoreCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', TicketCategory::class);
    }

    public function rules(): array
    {
        $tenantId = $this->user()?->tenant_id;

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255'],
            // Scoped per tenant — see StoreTicketRequest for why an
            // unscoped exists check would let a category reference
            // another tenant's category/department.
            'parent_id' => ['nullable', 'integer', Rule::exists('ticket_categories', 'id')->where('tenant_id', $tenantId)],
            'department_id' => ['nullable', 'integer', Rule::exists('departments', 'id')->where('tenant_id', $tenantId)],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('name') && ! $this->filled('slug')) {
            $this->merge(['slug' => Str::slug($this->input('name'))]);
        }
    }
}
