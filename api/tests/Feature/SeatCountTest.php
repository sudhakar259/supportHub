<?php

use App\Models\Customer;
use App\Services\PlanLimitService;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    testTenant();
});

it('counts only staff accounts against the seat limit', function () {
    $tenant = testTenant();
    actingAsAdministrator($tenant);
    Customer::factory()->create();
    Customer::factory()->create();

    expect(app(PlanLimitService::class)->usage($tenant, 'users'))->toBe(1);
});
