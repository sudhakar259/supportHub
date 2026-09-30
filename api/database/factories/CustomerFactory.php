<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Customer>
 */
class CustomerFactory extends Factory
{
    protected $model = Customer::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory()->afterCreating(fn (User $user) => $user->assignRole('Customer')),
            'company_name' => fake()->optional()->company(),
            'customer_type' => fake()->randomElement(['individual', 'business', 'vip']),
        ];
    }
}
