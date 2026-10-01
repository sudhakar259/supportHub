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

it('never exposes an internal note to the owning customer, in listing or direct access', function () {
    $customer = Customer::factory()->create();
    $ticket = Ticket::factory()->create(['customer_id' => $customer->id]);
    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/messages", [
            'body' => 'Customer seems upset, escalate if they reply again.',
            'is_internal' => true,
        ])->assertCreated()
        ->assertJsonPath('data.type', 'internal_note');

    $this->actingAs($agent, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/messages", [
            'body' => 'We are looking into this for you.',
        ])->assertCreated()
        ->assertJsonPath('data.type', 'agent_reply');

    $internalNote = $ticket->messages()->where('type', 'internal_note')->firstOrFail();

    // 1. Listing: the internal note must not appear at all.
    $listResponse = $this->actingAs($customer->user, 'api')
        ->getJson("/api/v1/tickets/{$ticket->id}/messages")
        ->assertOk();

    $types = collect($listResponse->json('data'))->pluck('type');
    expect($types)->not->toContain('internal_note');
    expect($types)->toContain('agent_reply');

    $bodies = collect($listResponse->json('data'))->pluck('body');
    expect($bodies)->not->toContain('Customer seems upset, escalate if they reply again.');

    // 2. Direct access by id: must be forbidden, not just filtered.
    $this->actingAs($customer->user, 'api')
        ->getJson("/api/v1/tickets/{$ticket->id}/messages/{$internalNote->id}")
        ->assertStatus(403);
});

it('allows staff with tickets.view_internal_notes to see internal notes', function () {
    $ticket = Ticket::factory()->create();
    $agent = actingAsAgent();

    $ticket->messages()->create(['author_id' => $agent->id, 'type' => 'internal_note', 'body' => 'Heads up.']);

    $response = $this->actingAs($agent, 'api')
        ->getJson("/api/v1/tickets/{$ticket->id}/messages")
        ->assertOk();

    expect(collect($response->json('data'))->pluck('type'))->toContain('internal_note');
});

it('forces a customer-authored message to type customer_message regardless of is_internal', function () {
    $customer = Customer::factory()->create();
    $ticket = Ticket::factory()->create(['customer_id' => $customer->id]);

    $this->actingAs($customer->user, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/messages", [
            'body' => 'Trying to sneak an internal note in.',
            'is_internal' => true,
        ])->assertCreated()
        ->assertJsonPath('data.type', 'customer_message');
});

it('forbids a customer from posting a message to a ticket that is not theirs', function () {
    $ticket = Ticket::factory()->create();
    $otherCustomer = Customer::factory()->create();

    $this->actingAs($otherCustomer->user, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/messages", ['body' => 'Hello?'])
        ->assertStatus(403);
});

it('denies an attachment download on an internal note to a customer', function () {
    $customer = Customer::factory()->create();
    $ticket = Ticket::factory()->create(['customer_id' => $customer->id]);
    $agent = actingAsAgent();

    $message = $ticket->messages()->create(['author_id' => $agent->id, 'type' => 'internal_note', 'body' => 'See attached.']);
    $attachment = $ticket->attachments()->create([
        'ticket_message_id' => $message->id,
        'uploaded_by' => $agent->id,
        'disk' => 'local',
        'path' => 'ticket-attachments/fake.txt',
        'original_filename' => 'internal.txt',
        'mime_type' => 'text/plain',
        'size' => 10,
    ]);

    $this->actingAs($customer->user, 'api')
        ->getJson("/api/v1/tickets/{$ticket->id}/attachments/{$attachment->id}/download")
        ->assertStatus(403);
});
