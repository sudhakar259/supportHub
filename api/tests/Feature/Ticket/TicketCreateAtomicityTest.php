<?php

use App\Actions\Ticket\CalculateSlaAction;
use App\Models\Customer;
use App\Models\Ticket;
use App\Models\TicketActivity;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    testTenant();
});

it('rolls back the ticket when a step after the insert fails', function () {
    $customer = Customer::factory()->create();

    $this->mock(CalculateSlaAction::class, function ($mock) {
        $mock->shouldReceive('execute')->andThrow(new RuntimeException('sla engine unavailable'));
    });

    $this->actingAs($customer->user, 'api')
        ->postJson('/api/v1/tickets', ['subject' => 'Atomicity probe', 'description' => 'Should not persist.'])
        ->assertStatus(500);

    expect(Ticket::where('subject', 'Atomicity probe')->exists())->toBeFalse();
    expect(TicketActivity::where('type', 'created')->exists())->toBeFalse();
});
