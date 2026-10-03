<?php

namespace App\Http\Requests\Category;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('category'));
    }

    public function rules(): array
    {
        $tenantId = $this->user()?->tenant_id;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'required', 'string', 'max:255'],
            'parent_id' => ['nullable', 'integer', Rule::exists('ticket_categories', 'id')->where('tenant_id', $tenantId)],
            'department_id' => ['nullable', 'integer', Rule::exists('departments', 'id')->where('tenant_id', $tenantId)],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $category = $this->route('category');
            $parentId = $this->input('parent_id');

            if ($parentId && (int) $parentId === $category->id) {
                $validator->errors()->add('parent_id', 'A category cannot be its own parent.');
            }
        });
    }
}
