<?php

namespace Database\Factories;

use App\Models\Webhook;
use Database\Factories\Concerns\DefaultsToTestTenant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Webhook>
 */
class WebhookFactory extends Factory
{
    use DefaultsToTestTenant;

    protected $model = Webhook::class;

    public function definition(): array
    {
        return [
            'tenant_id' => static::defaultTenantId(),
            'name' => fake()->unique()->words(2, true).' webhook',
            'url' => 'https://example.com/webhooks/'.fake()->unique()->uuid(),
            'secret' => Webhook::generateSecret(),
            'events' => Webhook::EVENTS,
            'is_active' => true,
        ];
    }
}
