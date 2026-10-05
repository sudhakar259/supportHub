<?php

namespace App\Http\Requests\Routing;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRoutingRuleRequest extends FormRequest
{
    use ValidatesRoutingTargets;

    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('rule'));
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'priority' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'stop_processing' => ['sometimes', 'boolean'],
            'conditions' => ['sometimes', 'array'],
            'conditions.*.field' => ['required_with:conditions', 'string', 'in:category_id,priority_id,customer_type,keyword'],
            'conditions.*.operator' => ['sometimes', 'string', 'in:=,!=,in'],
            'conditions.*.value' => ['required_with:conditions'],
            'actions' => ['sometimes', 'array', 'min:1'],
            'actions.*.type' => ['required_with:actions', 'string', 'in:assign_department,assign_agent,set_priority,escalate,send_notification'],
            'actions.*.value' => ['sometimes'],
        ];
    }
}
