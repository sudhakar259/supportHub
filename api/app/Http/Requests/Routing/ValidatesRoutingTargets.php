<?php

namespace App\Http\Requests\Routing;

use App\Models\Department;
use App\Models\TicketPriority;
use App\Models\User;
use Illuminate\Validation\Validator;

trait ValidatesRoutingTargets
{
    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [function (Validator $validator): void {
            $tenantId = $this->user()?->tenant_id;

            foreach ((array) $this->input('actions', []) as $index => $action) {
                $type = $action['type'] ?? null;

                if (! in_array($type, ['assign_department', 'assign_agent', 'set_priority'], true)) {
                    continue;
                }

                $value = $action['value'] ?? null;

                if (! is_int($value) && ! (is_string($value) && ctype_digit($value))) {
                    $validator->errors()->add("actions.$index.value", 'The target id must be a whole number.');

                    continue;
                }

                $exists = match ($type) {
                    'assign_department' => Department::query()->forTenant($tenantId)->whereKey($value)->where('is_active', true)->exists(),
                    'assign_agent' => User::query()->forTenant($tenantId)->whereKey($value)->where('is_active', true)->exists(),
                    'set_priority' => TicketPriority::query()->forTenant($tenantId)->whereKey($value)->exists(),
                };

                if (! $exists) {
                    $validator->errors()->add("actions.$index.value", 'The selected target does not exist or is not available in this workspace.');
                }
            }
        }];
    }
}
