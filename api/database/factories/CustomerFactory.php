<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\User;
use Database\Factories\Concerns\DefaultsToTestTenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    use DefaultsToTestTenant;

    protected $model = Customer::class;

    public function definition(): array
    {
        return [
            'tenant_id' => static::defaultTenantId(),
            'user_id' => User::factory()->afterCreating(fn (User $user) => $user->assignRole('Customer')),
            'company_name' => fake()->optional()->company(),
            'customer_type' => fake()->randomElement(['individual', 'business', 'vip']),
        ];
    }
}
