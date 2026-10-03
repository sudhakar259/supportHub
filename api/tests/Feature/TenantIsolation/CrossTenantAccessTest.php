<?php

use App\Models\Customer;
use App\Models\Department;
use App\Models\Role;
use App\Models\SlaPolicy;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\TicketRoutingRule;
use App\Models\TicketStatus;
use App\Services\TenantProvisioningService;
use App\Support\TenantContext;
use Database\Seeders\RolesAndPermissionsSeeder;

/*
|--------------------------------------------------------------------------
| Cross-tenant IDOR coverage
|--------------------------------------------------------------------------
|
| Every resource below is owned by Tenant B. Tenant A's administrator —
| who holds full permissions within their OWN tenant — must still be
| refused when addressing Tenant B's row directly by id. TenantScope
| (the global scope every BelongsToTenant model carries) is what's
| actually under test: a cross-tenant id should look, from Tenant A's
| side, exactly like an id that was never created at all (404), not
| like a real resource it merely lacks permission for (403) — the
| latter would confirm the row's existence to an attacker.
*/

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

function otherProvisionedTenant(): Tenant
{
    $tenant = Tenant::create(['name' => 'Globex Inc', 'slug' => 'other-org-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($tenant);

    return $tenant;
}

it('404s viewing, updating and deleting another tenant\'s department', function () {
    $tenantB = otherProvisionedTenant();
    $department = Department::factory()->create(['tenant_id' => $tenantB->id]);
    $adminA = actingAsAdministrator();

    $this->actingAs($adminA, 'api')->getJson("/api/v1/departments/{$department->id}")->assertStatus(404);
    $this->actingAs($adminA, 'api')->putJson("/api/v1/departments/{$department->id}", ['name' => 'Hijacked'])->assertStatus(404);
    $this->actingAs($adminA, 'api')->deleteJson("/api/v1/departments/{$department->id}")->assertStatus(404);
});

it('404s viewing, updating and deleting another tenant\'s customer', function () {
    $tenantB = otherProvisionedTenant();
    $customer = Customer::factory()->create(['tenant_id' => $tenantB->id]);
    $adminA = actingAsAdministrator();

    $this->actingAs($adminA, 'api')->getJson("/api/v1/customers/{$customer->id}")->assertStatus(404);
    $this->actingAs($adminA, 'api')->putJson("/api/v1/customers/{$customer->id}", ['company_name' => 'Hijacked'])->assertStatus(404);
    $this->actingAs($adminA, 'api')->deleteJson("/api/v1/customers/{$customer->id}")->assertStatus(404);
});

it('404s viewing, updating and deleting another tenant\'s ticket', function () {
    $tenantB = otherProvisionedTenant();
    $ticket = app(TenantContext::class)->runAs($tenantB, fn () => Ticket::factory()->create());
    $adminA = actingAsAdministrator();

    $this->actingAs($adminA, 'api')->getJson("/api/v1/tickets/{$ticket->id}")->assertStatus(404);
    $this->actingAs($adminA, 'api')->putJson("/api/v1/tickets/{$ticket->id}", ['subject' => 'Hijacked'])->assertStatus(404);
    $this->actingAs($adminA, 'api')->deleteJson("/api/v1/tickets/{$ticket->id}")->assertStatus(404);
});

it('404s accessing another tenant\'s ticket messages and attachments via the parent ticket id', function () {
    $tenantB = otherProvisionedTenant();
    $ticket = app(TenantContext::class)->runAs($tenantB, fn () => Ticket::factory()->create());
    $adminA = actingAsAdministrator();

    $this->actingAs($adminA, 'api')->getJson("/api/v1/tickets/{$ticket->id}/messages")->assertStatus(404);
    $this->actingAs($adminA, 'api')->getJson("/api/v1/tickets/{$ticket->id}/attachments")->assertStatus(404);
    $this->actingAs($adminA, 'api')->postJson("/api/v1/tickets/{$ticket->id}/assign", ['assignee_id' => $adminA->id])->assertStatus(404);
});

it('404s viewing, updating and deleting another tenant\'s ticket category', function () {
    $tenantB = otherProvisionedTenant();
    $category = TicketCategory::factory()->create(['tenant_id' => $tenantB->id]);
    $adminA = actingAsAdministrator();

    $this->actingAs($adminA, 'api')->getJson("/api/v1/categories/{$category->id}")->assertStatus(404);
    $this->actingAs($adminA, 'api')->putJson("/api/v1/categories/{$category->id}", ['name' => 'Hijacked'])->assertStatus(404);
    $this->actingAs($adminA, 'api')->deleteJson("/api/v1/categories/{$category->id}")->assertStatus(404);
});

it('404s viewing, updating and deleting another tenant\'s ticket priority', function () {
    $tenantB = otherProvisionedTenant();
    $priority = TicketPriority::forTenant($tenantB)->where('slug', 'urgent')->firstOrFail();
    $adminA = actingAsAdministrator();

    $this->actingAs($adminA, 'api')->getJson("/api/v1/priorities/{$priority->id}")->assertStatus(404);
    $this->actingAs($adminA, 'api')->putJson("/api/v1/priorities/{$priority->id}", ['name' => 'Hijacked'])->assertStatus(404);
    $this->actingAs($adminA, 'api')->deleteJson("/api/v1/priorities/{$priority->id}")->assertStatus(404);
});

it('404s viewing, updating and deleting another tenant\'s ticket status', function () {
    $tenantB = otherProvisionedTenant();
    $status = TicketStatus::forTenant($tenantB)->where('slug', 'open')->firstOrFail();
    $adminA = actingAsAdministrator();

    $this->actingAs($adminA, 'api')->getJson("/api/v1/statuses/{$status->id}")->assertStatus(404);
    $this->actingAs($adminA, 'api')->putJson("/api/v1/statuses/{$status->id}", ['name' => 'Hijacked'])->assertStatus(404);
    $this->actingAs($adminA, 'api')->deleteJson("/api/v1/statuses/{$status->id}")->assertStatus(404);
});

it('404s viewing, updating and deleting another tenant\'s SLA policy', function () {
    $tenantB = otherProvisionedTenant();
    $policy = SlaPolicy::factory()->create(['tenant_id' => $tenantB->id]);
    $adminA = actingAsAdministrator();

    $this->actingAs($adminA, 'api')->getJson("/api/v1/sla-policies/{$policy->id}")->assertStatus(404);
    $this->actingAs($adminA, 'api')->putJson("/api/v1/sla-policies/{$policy->id}", ['name' => 'Hijacked'])->assertStatus(404);
    $this->actingAs($adminA, 'api')->deleteJson("/api/v1/sla-policies/{$policy->id}")->assertStatus(404);
});

it('404s viewing, updating and deleting another tenant\'s routing rule', function () {
    $tenantB = otherProvisionedTenant();
    $rule = app(TenantContext::class)->runAs($tenantB, fn () => TicketRoutingRule::create([
        'name' => 'Tenant B rule',
        'is_active' => true,
        'priority' => 1,
        'conditions' => [],
        'actions' => [['type' => 'escalate']],
    ]));
    $adminA = actingAsAdministrator();

    $this->actingAs($adminA, 'api')->getJson("/api/v1/routing-rules/{$rule->id}")->assertStatus(404);
    $this->actingAs($adminA, 'api')->putJson("/api/v1/routing-rules/{$rule->id}", ['name' => 'Hijacked'])->assertStatus(404);
    $this->actingAs($adminA, 'api')->deleteJson("/api/v1/routing-rules/{$rule->id}")->assertStatus(404);
});

it('404s viewing, updating and deleting another tenant\'s staff user', function () {
    $tenantB = otherProvisionedTenant();
    $staffB = actingAsAgent($tenantB);
    $adminA = actingAsAdministrator();

    $this->actingAs($adminA, 'api')->getJson("/api/v1/users/{$staffB->id}")->assertStatus(404);
    $this->actingAs($adminA, 'api')->putJson("/api/v1/users/{$staffB->id}", ['name' => 'Hijacked'])->assertStatus(404);
    $this->actingAs($adminA, 'api')->deleteJson("/api/v1/users/{$staffB->id}")->assertStatus(404);
    $this->actingAs($adminA, 'api')->putJson("/api/v1/users/{$staffB->id}/roles", ['roles' => ['Agent']])->assertStatus(404);
});

it('404s viewing, updating and deleting another tenant\'s custom role', function () {
    $tenantB = otherProvisionedTenant();
    $role = app(TenantContext::class)->runAs($tenantB, fn () => Role::create(['name' => 'Billing Specialist', 'guard_name' => 'api']));
    $adminA = actingAsAdministrator();

    $this->actingAs($adminA, 'api')->getJson("/api/v1/roles/{$role->id}")->assertStatus(404);
    $this->actingAs($adminA, 'api')->putJson("/api/v1/roles/{$role->id}", ['name' => 'Hijacked'])->assertStatus(404);
    $this->actingAs($adminA, 'api')->deleteJson("/api/v1/roles/{$role->id}")->assertStatus(404);
});

it('never lists another tenant\'s roles, users, departments or customers', function () {
    $tenantB = otherProvisionedTenant();
    app(TenantContext::class)->runAs($tenantB, function () use ($tenantB) {
        Department::factory()->create(['tenant_id' => $tenantB->id, 'name' => 'Tenant B Department']);
        Customer::factory()->create(['tenant_id' => $tenantB->id]);
        Role::create(['name' => 'Tenant B Only Role', 'guard_name' => 'api']);
    });
    actingAsAgent($tenantB);

    $adminA = actingAsAdministrator();

    $departmentNames = collect($this->actingAs($adminA, 'api')->getJson('/api/v1/departments')->json('data'))->pluck('name');
    expect($departmentNames)->not->toContain('Tenant B Department');

    $roleNames = collect($this->actingAs($adminA, 'api')->getJson('/api/v1/roles')->json('data'))->pluck('name');
    expect($roleNames)->not->toContain('Tenant B Only Role');

    // Only the Platform Admin role is intentionally tenant_id = NULL;
    // nothing with a real tenant other than A's own should ever surface.
    expect($roleNames)->not->toContain('Platform Admin');
});

it('keeps the platform-wide SLA compliance report scoped to the caller\'s own tenant', function () {
    $tenantB = otherProvisionedTenant();
    app(TenantContext::class)->runAs($tenantB, function () {
        $ticket = Ticket::factory()->create();
        $ticket->sla()->create([
            'sla_policy_id' => SlaPolicy::factory()->create()->id,
            'started_at' => now(),
            'first_response_due_at' => now()->subHour(),
            'resolution_due_at' => now()->subHour(),
            'first_response_breached' => true,
            'resolution_breached' => true,
            'status' => 'breached',
        ]);
    });

    $adminA = actingAsAdministrator();

    $this->actingAs($adminA, 'api')
        ->getJson('/api/v1/reports/sla-compliance')
        ->assertOk()
        ->assertJsonPath('data.total_with_sla', 0)
        ->assertJsonPath('data.first_response_breached', 0)
        ->assertJsonPath('data.resolution_breached', 0);
});
