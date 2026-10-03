<?php

namespace App\Services;

use App\Exceptions\PlanLimitExceededException;
use App\Models\ApiCredential;
use App\Models\Customer;
use App\Models\Department;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use App\Models\Webhook;

/**
 * The single place plan limits are read and checked — section 20
 * explicitly asks that this not be duplicated across controllers.
 * Every tenant-resource-creating controller calls
 * assertCanCreate($tenant, 'feature') before creating the row; a
 * tenant with no subscription (shouldn't normally happen —
 * registration always creates one) is treated as unlimited rather than
 * blocking everything, since that's a data-integrity problem to fix,
 * not a billing decision to enforce here.
 *
 * Usage is computed live (a COUNT query) rather than maintained in a
 * separate running-total column: at this system's scale that's cheap,
 * and a live count can never drift out of sync with reality the way a
 * denormalized counter can.
 */
class PlanLimitService
{
    public function usage(Tenant $tenant, string $feature): int
    {
        return match ($feature) {
            'users' => User::forTenant($tenant)->count(),
            'customers' => Customer::forTenant($tenant)->count(),
            'departments' => Department::forTenant($tenant)->count(),
            'tickets_per_month' => Ticket::forTenant($tenant)->where('created_at', '>=', now()->startOfMonth())->count(),
            'webhooks' => Webhook::forTenant($tenant)->count(),
            'api_credentials' => ApiCredential::forTenant($tenant)->where('status', 'active')->count(),
            default => 0,
        };
    }

    public function limit(Tenant $tenant, string $feature): ?int
    {
        $plan = $tenant->subscription?->plan;

        return $plan?->limit($feature);
    }

    public function remaining(Tenant $tenant, string $feature): ?int
    {
        $limit = $this->limit($tenant, $feature);

        return $limit === null ? null : max(0, $limit - $this->usage($tenant, $feature));
    }

    public function hasReachedLimit(Tenant $tenant, string $feature): bool
    {
        $limit = $this->limit($tenant, $feature);

        if ($limit === null) {
            return false;
        }

        return $this->usage($tenant, $feature) >= $limit;
    }

    /**
     * @throws PlanLimitExceededException
     */
    public function assertCanCreate(Tenant $tenant, string $feature): void
    {
        if ($this->hasReachedLimit($tenant, $feature)) {
            throw new PlanLimitExceededException($feature, $this->limit($tenant, $feature));
        }
    }
}
