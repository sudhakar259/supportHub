<?php

use App\Models\Customer;

beforeEach(function () {
    testTenant();
});

it('creates several integration customers in one tenant when external_id is omitted', function () {
    $pair = createIntegrationCredential(testTenant());

    foreach (['first', 'second'] as $name) {
        withIntegrationAuth($this, $pair)
            ->postJson('/api/v1/integration/customers', [
                'name' => "Synced {$name}",
                'email' => "synced.{$name}@example.com",
            ])
            ->assertCreated();
    }

    expect(Customer::whereNull('external_id')->count())->toBe(2);
});
