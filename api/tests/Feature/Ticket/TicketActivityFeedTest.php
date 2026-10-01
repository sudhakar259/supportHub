<?php

use App\Models\Customer;
use App\Models\Ticket;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\TicketPrioritySeeder;
use Database\Seeders\TicketStatusSeeder;

beforeEach(function () {
    $this->seed([
        RolesAndPermissionsSeeder::class,
        TicketStatusSeeder::class,
        TicketPrioritySeeder::class,
    ]);
});

// QA regression (2026-10-01): TicketActivityResource existed and
// TicketActivity rows were being logged, but no route ever exposed them —
// AuditLogController's docblock claimed "GET /tickets/{ticket} includes
// its activities," which was false. This adds the missing endpoint.
it('exposes a ticket\'s activity feed to staff with access', function () {
    $customer = Customer::factory()->create();
    $ticket = Ticket::factory()->create(['customer_id' => $customer->id]);
    $agent = actingAsAgent();

    // Ticket::factory() inserts directly, bypassing CreateTicketAction (and
    // the activity log entry it writes) — log one explicitly here.
    $ticket->activities()->create([
        'type' => 'created',
        'description' => "Ticket created by {$customer->user->name}",
        'created_at' => now(),
    ]);

    $this->actingAs($agent, 'api')
        ->getJson("/api/v1/tickets/{$ticket->id}/activities")
        ->assertOk()
        ->assertJsonPath('data.0.type', 'created');
});

it('denies a ticket\'s activity feed to a customer who does not own it', function () {
    $ticket = Ticket::factory()->create();
    $otherCustomer = Customer::factory()->create();

    $this->actingAs($otherCustomer->user, 'api')
        ->getJson("/api/v1/tickets/{$ticket->id}/activities")
        ->assertStatus(403);
});
