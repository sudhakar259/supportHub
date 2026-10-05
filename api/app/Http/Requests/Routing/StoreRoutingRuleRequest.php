<?php

namespace App\Http\Requests\Routing;

use App\Models\TicketRoutingRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreRoutingRuleRequest extends FormRequest
{
    use ValidatesRoutingTargets;

    public function authorize(): bool
    {
        return $this->user()->can('create', TicketRoutingRule::class);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'priority' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'stop_processing' => ['sometimes', 'boolean'],
            'conditions' => ['required', 'array'],
            'conditions.*.field' => ['required', 'string', 'in:category_id,priority_id,customer_type,keyword'],
            'conditions.*.operator' => ['sometimes', 'string', 'in:=,!=,in'],
            'conditions.*.value' => ['required'],
            'actions' => ['required', 'array', 'min:1'],
            'actions.*.type' => ['required', 'string', 'in:assign_department,assign_agent,set_priority,escalate,send_notification'],
            'actions.*.value' => ['sometimes'],
        ];
    }
}
