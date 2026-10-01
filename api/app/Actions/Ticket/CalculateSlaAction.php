<?php

namespace App\Actions\Ticket;

use App\Models\SlaPolicy;
use App\Models\Ticket;
use App\Models\TicketSla;
use App\Services\BusinessHoursCalculator;
use Carbon\CarbonImmutable;

class CalculateSlaAction
{
    public function __construct(private BusinessHoursCalculator $businessHours) {}

    public function execute(Ticket $ticket): ?TicketSla
    {
        $policy = $this->resolvePolicy($ticket);

        if (! $policy) {
            return null;
        }

        $startedAt = CarbonImmutable::now();

        $firstResponseDue = $this->dueAt($startedAt, $policy->first_response_minutes, $policy);
        $resolutionDue = $this->dueAt($startedAt, $policy->resolution_minutes, $policy);

        return TicketSla::updateOrCreate(
            ['ticket_id' => $ticket->id],
            [
                'sla_policy_id' => $policy->id,
                'started_at' => $startedAt,
                'first_response_due_at' => $firstResponseDue,
                'resolution_due_at' => $resolutionDue,
                'status' => 'pending',
            ]
        );
    }

    protected function resolvePolicy(Ticket $ticket): ?SlaPolicy
    {
        $query = SlaPolicy::query()->where('is_active', true);

        // Most specific first: priority + department, then priority-only
        // default, then any department-less default for the priority.
        $policy = (clone $query)
            ->where('priority_id', $ticket->priority_id)
            ->where('department_id', $ticket->department_id)
            ->first();

        $policy ??= (clone $query)
            ->where('priority_id', $ticket->priority_id)
            ->whereNull('department_id')
            ->orderByDesc('is_default')
            ->first();

        return $policy;
    }

    protected function dueAt(CarbonImmutable $from, int $minutes, SlaPolicy $policy): CarbonImmutable
    {
        if ($policy->business_hours_only && $policy->businessHours) {
            return $this->businessHours->addBusinessMinutes($from, $minutes, $policy->businessHours);
        }

        return $from->addMinutes($minutes);
    }
}
