<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Ticket;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use Database\Factories\Concerns\DefaultsToTestTenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Ticket>
 */
class TicketFactory extends Factory
{
    use DefaultsToTestTenant;

    protected $model = Ticket::class;

    public function definition(): array
    {
        $tenantId = static::defaultTenantId();

        return [
            'tenant_id' => $tenantId,
            'ticket_number' => 'TKT-'.now()->format('Y').'-'.str_pad((string) fake()->unique()->numberBetween(1, 999999), 6, '0', STR_PAD_LEFT),
            'customer_id' => Customer::factory(),
            'subject' => fake()->sentence(6),
            'description' => fake()->paragraph(),
            // Requires TicketPrioritySeeder/TicketStatusSeeder to have run
            // for this tenant (TenantProvisioningService does, for
            // testTenant()) — explicitly scoped with forTenant() rather
            // than relying on an ambient TenantContext, since this
            // closure may run outside one.
            'priority_id' => fn () => TicketPriority::forTenant($tenantId)->where('is_default', true)->firstOrFail()->id,
            'status_id' => fn () => TicketStatus::forTenant($tenantId)->where('slug', 'open')->firstOrFail()->id,
        ];
    }
}
