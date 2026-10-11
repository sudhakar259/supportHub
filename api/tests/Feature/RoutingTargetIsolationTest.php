<?php

use App\Actions\Ticket\ApplyTicketRoutingAction;
use App\Models\Department;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\TicketRoutingRule;
use App\Support\TenantContext;

beforeEach(fn () => testTenant());

function foreignDepartment(): Department
{
    $other = Tenant::create(['name' => 'Other Tenant', 'slug' => 'other-'.uniqid(), 'status' => 'active']);

    return Department::factory()->create(['tenant_id' => $other->id, 'is_active' => true]);
}

function routingPayload(int $departmentId): array
{
    return [
        'name' => 'Route to department',
        'conditions' => [['field' => 'keyword', 'operator' => '=', 'value' => 'billing']],
        'actions' => [['type' => 'assign_department', 'value' => $departmentId]],
    ];
}

it('rejects a routing rule that assigns a department from another tenant', function () {
    $admin = actingAsAdministrator();
    $foreign = foreignDepartment();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/routing-rules', routingPayload($foreign->id))
        ->assertStatus(422)
        ->assertJsonValidationErrors(['actions.0.value']);

    expect(TicketRoutingRule::count())->toBe(0);
});

it('rejects a routing rule that assigns a deactivated department', function () {
    $admin = actingAsAdministrator();
    $department = Department::factory()->create(['is_active' => false]);

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/routing-rules', routingPayload($department->id))
        ->assertStatus(422)
        ->assertJsonValidationErrors(['actions.0.value']);
});

it('accepts a routing rule that assigns an active department in the same tenant', function () {
    $admin = actingAsAdministrator();
    $department = Department::factory()->create(['is_active' => true]);

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/routing-rules', routingPayload($department->id))
        ->assertCreated();
});

it('rejects a routing rule update that points at a foreign department', function () {
    $admin = actingAsAdministrator();
    $rule = TicketRoutingRule::create([
        'name' => 'Existing',
        'conditions' => [['field' => 'keyword', 'operator' => '=', 'value' => 'x']],
        'actions' => [['type' => 'escalate']],
    ]);

    $this->actingAs($admin, 'api')
        ->putJson('/api/v1/routing-rules/'.$rule->id, [
            'actions' => [['type' => 'assign_department', 'value' => foreignDepartment()->id]],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['actions.0.value']);
});

it('does not route a ticket to a department that was deactivated after the rule was saved', function () {
    actingAsAdministrator();
    $department = Department::factory()->create(['is_active' => true]);

    TicketRoutingRule::create([
        'name' => 'Route billing',
        'conditions' => [['field' => 'keyword', 'operator' => '=', 'value' => 'billing']],
        'actions' => [['type' => 'assign_department', 'value' => $department->id]],
    ]);

    $department->update(['is_active' => false]);

    $ticket = new Ticket(['subject' => 'Billing question', 'description' => 'Invoice']);
    app(ApplyTicketRoutingAction::class)->execute($ticket);

    expect($ticket->department_id)->toBeNull();
});

it('does not route a ticket to a department from another tenant', function () {
    actingAsAdministrator();
    $foreign = foreignDepartment();

    TicketRoutingRule::create([
        'name' => 'Injected',
        'conditions' => [['field' => 'keyword', 'operator' => '=', 'value' => 'billing']],
        'actions' => [['type' => 'assign_department', 'value' => $foreign->id]],
    ]);

    $ticket = new Ticket(['subject' => 'Billing question', 'description' => 'Invoice']);
    app(ApplyTicketRoutingAction::class)->execute($ticket);

    expect($ticket->department_id)->toBeNull();
});

it('routes a ticket to an active department in the current tenant', function () {
    actingAsAdministrator();
    $department = Department::factory()->create(['is_active' => true]);

    TicketRoutingRule::create([
        'name' => 'Route billing',
        'conditions' => [['field' => 'keyword', 'operator' => '=', 'value' => 'billing']],
        'actions' => [['type' => 'assign_department', 'value' => $department->id]],
    ]);

    $ticket = new Ticket(['subject' => 'Billing question', 'description' => 'Invoice']);
    app(ApplyTicketRoutingAction::class)->execute($ticket);

    expect($ticket->department_id)->toBe($department->id);
    expect(app(TenantContext::class)->id())->not->toBeNull();
});

it('rejects a routing rule that assigns tickets to a customer account', function () {
    $admin = actingAsAdministrator();
    $customer = actingAsCustomer();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/routing-rules', [
            'name' => 'Bad assign',
            'conditions' => [['field' => 'keyword', 'operator' => '=', 'value' => 'billing']],
            'actions' => [['type' => 'assign_agent', 'value' => $customer->id]],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['actions.0.value']);
});

it('accepts a routing rule that assigns tickets to an active agent', function () {
    $admin = actingAsAdministrator();
    $agent = actingAsAgent();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/routing-rules', [
            'name' => 'Good assign',
            'conditions' => [['field' => 'keyword', 'operator' => '=', 'value' => 'billing']],
            'actions' => [['type' => 'assign_agent', 'value' => $agent->id]],
        ])
        ->assertCreated();
});

it('does not apply an assign_agent action that points at a customer', function () {
    actingAsAdministrator();
    $customer = actingAsCustomer();
    $agent = actingAsAgent();

    TicketRoutingRule::create([
        'name' => 'To customer',
        'conditions' => [['field' => 'keyword', 'operator' => '=', 'value' => 'billing']],
        'actions' => [['type' => 'assign_agent', 'value' => $customer->id]],
    ]);
    TicketRoutingRule::create([
        'name' => 'To agent',
        'conditions' => [['field' => 'keyword', 'operator' => '=', 'value' => 'invoice']],
        'actions' => [['type' => 'assign_agent', 'value' => $agent->id]],
    ]);

    $ticket = new Ticket(['subject' => 'Billing question', 'description' => 'unrelated']);
    expect(app(ApplyTicketRoutingAction::class)->execute($ticket)['assignee_id'])->toBeNull();

    $ticket = new Ticket(['subject' => 'Invoice question', 'description' => 'unrelated']);
    expect(app(ApplyTicketRoutingAction::class)->execute($ticket)['assignee_id'])->toBe($agent->id);
});

it('refuses to manually assign a ticket to a customer', function () {
    $admin = actingAsAdministrator();
    $customer = actingAsCustomer();
    $ticket = Ticket::factory()->create();

    $this->actingAs($admin, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/assign", ['assignee_id' => $customer->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['assignee_id']);

    expect($ticket->fresh()->assignee_id)->toBeNull();
});
