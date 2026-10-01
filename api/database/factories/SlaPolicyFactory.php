<?php

namespace Database\Factories;

use App\Models\SlaPolicy;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SlaPolicy>
 */
class SlaPolicyFactory extends Factory
{
    protected $model = SlaPolicy::class;

    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true).' SLA',
            'first_response_minutes' => 60,
            'resolution_minutes' => 480,
            'business_hours_only' => false,
            'is_active' => true,
        ];
    }
}
