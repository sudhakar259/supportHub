<?php

namespace Database\Factories;

use App\Models\Department;
use Database\Factories\Concerns\DefaultsToTestTenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Department>
 */
class DepartmentFactory extends Factory
{
    use DefaultsToTestTenant;

    protected $model = Department::class;

    public function definition(): array
    {
        return [
            'tenant_id' => static::defaultTenantId(),
            'name' => fake()->unique()->company(),
            'code' => strtoupper(fake()->unique()->lexify('???')),
            'description' => fake()->sentence(),
            'is_active' => true,
        ];
    }
}
