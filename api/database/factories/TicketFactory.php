<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Ticket;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Ticket>
 */
class TicketFactory extends Factory
{
    protected $model = Ticket::class;

    public function definition(): array
    {
        return [
            'ticket_number' => 'TKT-'.now()->format('Y').'-'.str_pad((string) fake()->unique()->numberBetween(1, 999999), 6, '0', STR_PAD_LEFT),
            'customer_id' => Customer::factory(),
            'subject' => fake()->sentence(6),
            'description' => fake()->paragraph(),
            // Requires TicketPrioritySeeder/TicketStatusSeeder to have run —
            // these are fixed reference data, not factory-generated.
            'priority_id' => fn () => TicketPriority::where('is_default', true)->firstOrFail()->id,
            'status_id' => fn () => TicketStatus::where('slug', 'open')->firstOrFail()->id,
        ];
    }
}
