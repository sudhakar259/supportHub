<?php

namespace App\Actions\Ticket;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\TicketPriority;
use App\Models\TicketRoutingRule;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Support\Str;

/**
 * Evaluates active routing rules (in priority order) against a
 * newly-created ticket and applies the first matching rule's actions
 * directly onto the (unsaved) ticket — the caller is responsible for
 * persisting it. Conditions within a single rule are AND-combined;
 * a rule with stop_processing=true halts evaluation of further rules
 * once it matches.
 */
class ApplyTicketRoutingAction
{
    /**
     * @return array{escalate: bool, notify_template_keys: array<int, string>, assignee_id: int|null}
     */
    public function execute(Ticket $ticket): array
    {
        $outcome = ['escalate' => false, 'notify_template_keys' => [], 'assignee_id' => null];

        $rules = TicketRoutingRule::query()
            ->where('is_active', true)
            ->orderBy('priority')
            ->get();

        foreach ($rules as $rule) {
            if (! $this->matches($ticket, $rule->conditions ?? [])) {
                continue;
            }

            $this->applyActions($ticket, $rule->actions ?? [], $outcome);

            if ($rule->stop_processing) {
                break;
            }
        }

        return $outcome;
    }

    protected function matches(Ticket $ticket, array $conditions): bool
    {
        foreach ($conditions as $condition) {
            if (! $this->matchesCondition($ticket, $condition)) {
                return false;
            }
        }

        return true;
    }

    protected function matchesCondition(Ticket $ticket, array $condition): bool
    {
        $field = $condition['field'] ?? null;
        $operator = $condition['operator'] ?? '=';
        $value = $condition['value'] ?? null;

        $actual = match ($field) {
            'category_id' => $ticket->category_id,
            'priority_id' => $ticket->priority_id,
            'customer_type' => $ticket->customer?->customer_type,
            'keyword' => $ticket->subject.' '.$ticket->description,
            default => null,
        };

        if ($field === 'keyword') {
            return Str::contains((string) $actual, (string) $value, ignoreCase: true);
        }

        return match ($operator) {
            '!=' => $actual != $value,
            'in' => in_array($actual, (array) $value, false),
            default => $actual == $value,
        };
    }

    protected function applyActions(Ticket $ticket, array $actions, array &$outcome): void
    {
        foreach ($actions as $action) {
            $type = $action['type'] ?? null;
            $value = $action['value'] ?? null;

            if ($type === 'assign_department' && $this->isAvailable(Department::class, $value, activeOnly: true)) {
                $ticket->department_id = $value;
            } elseif ($type === 'assign_agent' && $this->isAvailable(User::class, $value, activeOnly: true)) {
                $outcome['assignee_id'] = $value;
            } elseif ($type === 'set_priority' && $this->isAvailable(TicketPriority::class, $value)) {
                $ticket->priority_id = $value;
            } elseif ($type === 'escalate') {
                $outcome['escalate'] = true;
            } elseif ($type === 'send_notification') {
                $outcome['notify_template_keys'][] = $value;
            }
        }
    }

    protected function isAvailable(string $model, mixed $value, bool $activeOnly = false): bool
    {
        if (! is_int($value) && ! (is_string($value) && ctype_digit($value))) {
            return false;
        }

        $query = $model::query()->forTenant(app(TenantContext::class)->id() ?? 0)->whereKey($value);

        if ($activeOnly) {
            $query->where('is_active', true);
        }

        return $query->exists();
    }
}
