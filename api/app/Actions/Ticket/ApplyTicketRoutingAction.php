<?php

namespace App\Actions\Ticket;

use App\Models\Ticket;
use App\Models\TicketRoutingRule;
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

            match ($type) {
                'assign_department' => $ticket->department_id = $value,
                'assign_agent' => $outcome['assignee_id'] = $value,
                'set_priority' => $ticket->priority_id = $value,
                'escalate' => $outcome['escalate'] = true,
                'send_notification' => $outcome['notify_template_keys'][] = $value,
                default => null,
            };
        }
    }
}
