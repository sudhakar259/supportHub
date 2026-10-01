<?php

namespace App\Actions\Ticket;

use App\Models\Department;
use App\Models\Ticket;
use App\Models\TicketStatus;
use App\Models\User;

/**
 * Picks the agent in a department with the fewest currently-open
 * tickets assigned to them (workload-based). Agents are department
 * members with the ability to be assigned tickets; this intentionally
 * does not consider Department Managers or Administrators unless they
 * are also explicit department members, since broad-access roles
 * shouldn't silently absorb auto-assigned queue load.
 */
class AutoAssignAgentAction
{
    public function execute(Department $department, ?Ticket $excludingTicket = null): ?User
    {
        $openStatusIds = TicketStatus::where('is_closed', false)->pluck('id');

        return $department->users()
            ->withCount(['assignedTickets as open_tickets_count' => function ($query) use ($openStatusIds, $excludingTicket) {
                $query->whereIn('status_id', $openStatusIds);

                if ($excludingTicket) {
                    $query->whereKeyNot($excludingTicket->id);
                }
            }])
            ->where('is_active', true)
            ->whereHas('roles', fn ($query) => $query->whereIn('name', ['Agent', 'Senior Agent']))
            ->orderBy('open_tickets_count')
            ->orderBy('users.id')
            ->first();
    }
}
