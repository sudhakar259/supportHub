<?php

use App\Models\Customer;
use App\Models\Department;
use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\TicketRoutingRule;
use App\Models\TicketStatus;

beforeEach(function () {
    testTenant();
});

it('lets a customer create a ticket that gets a formatted ticket number', function () {
    $customer = Customer::factory()->create();

    $response = $this->actingAs($customer->user, 'api')
        ->postJson('/api/v1/tickets', [
            'subject' => 'Unable to login',
            'description' => 'I get an error when logging in.',
        ])
        ->assertCreated();

    $response->assertJsonPath('data.subject', 'Unable to login')
        ->assertJsonPath('data.status.slug', 'open');

    expect($response->json('data.ticket_number'))->toMatch('/^TKT-\d{4}-\d{6}$/');

    $this->assertDatabaseHas('tickets', ['subject' => 'Unable to login', 'customer_id' => $customer->id]);
});

it('requires staff to specify which customer a ticket is for', function () {
    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')
        ->postJson('/api/v1/tickets', ['subject' => 'x', 'description' => 'y'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['customer_id']);
});

it('forbids a customer from viewing another customer\'s ticket', function () {
    $ticket = Ticket::factory()->create();
    $otherCustomer = Customer::factory()->create();

    $this->actingAs($otherCustomer->user, 'api')
        ->getJson("/api/v1/tickets/{$ticket->id}")
        ->assertStatus(403);
});

it('lets the owning customer view their own ticket', function () {
    $customer = Customer::factory()->create();
    $ticket = Ticket::factory()->create(['customer_id' => $customer->id]);

    $this->actingAs($customer->user, 'api')
        ->getJson("/api/v1/tickets/{$ticket->id}")
        ->assertOk()
        ->assertJsonPath('data.id', $ticket->id);
});

it('scopes an agent\'s ticket list to their own department', function () {
    $deptA = Department::factory()->create();
    $deptB = Department::factory()->create();

    $agent = actingAsAgent();
    $agent->departments()->attach($deptA->id);

    Ticket::factory()->create(['department_id' => $deptA->id, 'subject' => 'In my department']);
    Ticket::factory()->create(['department_id' => $deptB->id, 'subject' => 'Not my department']);

    $response = $this->actingAs($agent, 'api')->getJson('/api/v1/tickets')->assertOk();

    $subjects = collect($response->json('data'))->pluck('subject');
    expect($subjects)->toContain('In my department');
    expect($subjects)->not->toContain('Not my department');
});

it('lets an administrator see tickets across all departments', function () {
    $deptA = Department::factory()->create();
    Ticket::factory()->create(['department_id' => $deptA->id]);

    $admin = actingAsAdministrator();

    $response = $this->actingAs($admin, 'api')->getJson('/api/v1/tickets')->assertOk();

    expect($response->json('data'))->toHaveCount(1);
});

it('runs an active routing rule on ticket creation', function () {
    $department = Department::factory()->create();
    $category = TicketCategory::factory()->create();

    TicketRoutingRule::create([
        'name' => 'Route category to department',
        'is_active' => true,
        'priority' => 1,
        'stop_processing' => true,
        'conditions' => [['field' => 'category_id', 'operator' => '=', 'value' => $category->id]],
        'actions' => [['type' => 'assign_department', 'value' => $department->id]],
    ]);

    $customer = Customer::factory()->create();

    $response = $this->actingAs($customer->user, 'api')
        ->postJson('/api/v1/tickets', [
            'subject' => 'Routed ticket',
            'description' => 'Should land in the right department.',
            'category_id' => $category->id,
        ])->assertCreated();

    $response->assertJsonPath('data.department.id', $department->id);
});

it('auto-assigns the agent with the lightest workload when a routing rule sets a department', function () {
    $department = Department::factory()->create();

    $busyAgent = actingAsAgent();
    $busyAgent->departments()->attach($department->id);
    $openStatusId = TicketStatus::where('slug', 'open')->value('id');
    Ticket::factory()->count(3)->create([
        'department_id' => $department->id,
        'assignee_id' => $busyAgent->id,
        'status_id' => $openStatusId,
    ]);

    $freeAgent = actingAsAgent();
    $freeAgent->departments()->attach($department->id);

    TicketRoutingRule::create([
        'name' => 'Everything to this department',
        'is_active' => true,
        'priority' => 1,
        'stop_processing' => true,
        'conditions' => [],
        'actions' => [['type' => 'assign_department', 'value' => $department->id]],
    ]);

    $customer = Customer::factory()->create();

    $response = $this->actingAs($customer->user, 'api')
        ->postJson('/api/v1/tickets', [
            'subject' => 'Needs an agent',
            'description' => 'Should go to the least busy agent.',
        ])->assertCreated();

    $response->assertJsonPath('data.department.id', $department->id)
        ->assertJsonPath('data.assignee.id', $freeAgent->id);

    $this->assertDatabaseHas('ticket_assignments', [
        'ticket_id' => $response->json('data.id'),
        'assignee_id' => $freeAgent->id,
        'assignment_type' => 'automatic',
    ]);
});

it('records a full assignment history across reassignments', function () {
    $ticket = Ticket::factory()->create();
    $agent1 = actingAsAgent();
    $agent2 = actingAsAgent();
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/assign", ['assignee_id' => $agent1->id])
        ->assertOk();

    $this->actingAs($admin, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/reassign", ['assignee_id' => $agent2->id])
        ->assertOk()
        ->assertJsonPath('data.assignee.id', $agent2->id);

    expect($ticket->assignments()->count())->toBe(2);

    $first = $ticket->assignments()->where('assignee_id', $agent1->id)->first();
    expect($first->unassigned_at)->not->toBeNull();

    $second = $ticket->assignments()->where('assignee_id', $agent2->id)->first();
    expect($second->unassigned_at)->toBeNull();
    expect($second->assignment_type->value)->toBe('reassignment');
});
