<?php

use App\Models\TicketPriority;

beforeEach(fn () => testTenant());

it('lets an admin create and list a routing rule', function () {
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/routing-rules', [
            'name' => 'VIP to senior queue',
            'priority' => 1,
            'conditions' => [['field' => 'customer_type', 'operator' => '=', 'value' => 'vip']],
            'actions' => [['type' => 'set_priority', 'value' => TicketPriority::where('slug', 'urgent')->value('id')]],
        ])->assertCreated()
        ->assertJsonPath('data.name', 'VIP to senior queue');

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/routing-rules')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

it('validates routing rule condition and action fields', function () {
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/routing-rules', [
            'name' => 'Bad rule',
            'conditions' => [['field' => 'not_a_real_field', 'value' => 'x']],
            'actions' => [['type' => 'not_a_real_action']],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['conditions.0.field', 'actions.0.type']);
});

it('forbids an agent from managing routing rules', function () {
    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')
        ->getJson('/api/v1/routing-rules')
        ->assertStatus(403);
});

it('lets an admin create an SLA policy scoped to a priority', function () {
    $admin = actingAsAdministrator();
    $priority = TicketPriority::where('slug', 'urgent')->first();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/sla-policies', [
            'name' => 'Urgent 2h',
            'priority_id' => $priority->id,
            'first_response_minutes' => 15,
            'resolution_minutes' => 120,
        ])->assertCreated()
        ->assertJsonPath('data.first_response_minutes', 15);

    $this->assertDatabaseHas('sla_policies', ['name' => 'Urgent 2h']);
});
