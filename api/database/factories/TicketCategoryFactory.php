<?php

namespace Database\Factories;

use App\Models\TicketCategory;
use Database\Factories\Concerns\DefaultsToTestTenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<TicketCategory>
 */
class TicketCategoryFactory extends Factory
{
    use DefaultsToTestTenant;

    protected $model = TicketCategory::class;

    public function definition(): array
    {
        $name = fake()->unique()->words(2, true);

        return [
            'tenant_id' => static::defaultTenantId(),
            'name' => ucfirst($name),
            'slug' => Str::slug($name),
            'is_active' => true,
            'sort_order' => 0,
        ];
    }
}
