<?php

use App\Models\Customer;
use App\Models\SlaPolicy;
use App\Models\Ticket;
use App\Models\TicketStatus;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\TicketPrioritySeeder;
use Database\Seeders\TicketStatusSeeder;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    $this->seed([
        RolesAndPermissionsSeeder::class,
        TicketStatusSeeder::class,
        TicketPrioritySeeder::class,
    ]);
});

function setTicketStatus(Ticket $ticket, string $slug): Ticket
{
    $ticket->update(['status_id' => TicketStatus::where('slug', $slug)->value('id')]);

    return $ticket->fresh();
}

it('resolves an open ticket and records resolved_at plus status history', function () {
    $ticket = Ticket::factory()->create();
    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/resolve", ['reason' => 'Fixed.'])
        ->assertOk()
        ->assertJsonPath('data.status.slug', 'resolved');

    $ticket->refresh();
    expect($ticket->resolved_at)->not->toBeNull();
    expect($ticket->statusHistory()->count())->toBe(1);
    expect($ticket->statusHistory()->first()->reason)->toBe('Fixed.');
});

it('rejects closing a ticket directly from Open (must go through Resolved)', function () {
    $ticket = Ticket::factory()->create(); // starts Open
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/close")
        ->assertStatus(422)
        ->assertJsonPath('success', false)
        ->assertJsonPath('message', 'Cannot transition a ticket from "open" to "closed".');

    expect($ticket->fresh()->status->slug)->toBe('open');
});

it('allows the full happy path: open -> resolved -> closed -> reopened', function () {
    $ticket = Ticket::factory()->create();
    $agent = actingAsAgent();
    $admin = actingAsAdministrator();

    $this->actingAs($agent, 'api')->postJson("/api/v1/tickets/{$ticket->id}/resolve")->assertOk();
    $this->actingAs($admin, 'api')->postJson("/api/v1/tickets/{$ticket->id}/close")->assertOk();

    $ticket->refresh();
    expect($ticket->status->slug)->toBe('closed');
    expect($ticket->closed_at)->not->toBeNull();
    expect($ticket->reopened_count)->toBe(0);

    $this->actingAs($admin, 'api')->postJson("/api/v1/tickets/{$ticket->id}/reopen")->assertOk()
        ->assertJsonPath('data.status.slug', 'reopened');

    $ticket->refresh();
    expect($ticket->closed_at)->toBeNull();
    expect($ticket->reopened_count)->toBe(1);
});

it('rejects escalating a ticket that is already closed', function () {
    $ticket = setTicketStatus(Ticket::factory()->create(), 'closed');
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/escalate")
        ->assertStatus(422);
});

it('lets the owning customer reopen their own resolved ticket', function () {
    $customer = Customer::factory()->create();
    $ticket = setTicketStatus(Ticket::factory()->create(['customer_id' => $customer->id]), 'resolved');

    $this->actingAs($customer->user, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/reopen")
        ->assertOk()
        ->assertJsonPath('data.status.slug', 'reopened');
});

it('forbids an agent without tickets.resolve from resolving a ticket', function () {
    $ticket = Ticket::factory()->create();

    // Build a role with no resolve permission to prove the gate is checked.
    $role = Role::create(['name' => 'Read Only Agent', 'guard_name' => 'api']);
    $role->syncPermissions(['tickets.view']);
    $user = User::factory()->create();
    $user->assignRole('Read Only Agent');

    $this->actingAs($user, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/resolve")
        ->assertStatus(403);
});

it('marks the SLA as breached when resolved after the resolution deadline', function () {
    $ticket = Ticket::factory()->create();
    $ticket->sla()->create([
        'sla_policy_id' => SlaPolicy::factory()->create([
            'priority_id' => $ticket->priority_id,
            'first_response_minutes' => 60,
            'resolution_minutes' => 60,
        ])->id,
        'started_at' => now()->subHours(3),
        'first_response_due_at' => now()->subHours(2),
        'resolution_due_at' => now()->subHours(2),
    ]);

    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')->postJson("/api/v1/tickets/{$ticket->id}/resolve")->assertOk();

    $sla = $ticket->sla()->first();
    expect($sla->resolution_breached)->toBeTrue();
    expect($sla->status)->toBe('breached');
});
