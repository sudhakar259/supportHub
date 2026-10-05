<?php

use App\Models\Customer;
use App\Models\Department;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Services\TenantProvisioningService;
use App\Support\TenantContext;

/*
|--------------------------------------------------------------------------
| Cross-tenant reference validation
|--------------------------------------------------------------------------
|
| Complements CrossTenantAccessTest (which checks resources already
| addressed directly by id). These check the other half: request
| bodies that REFERENCE another resource by id (a ticket's
| category_id, an SLA policy's department_id, ...) must reject a
| cross-tenant id with a normal 422, not silently cross-link the two
| tenants' data. Each pairs with a "same value is fine for two
| different tenants" case, since the fix for the first (scoping
| unique/exists checks to tenant_id) could otherwise regress the
| second (falsely rejecting a value another tenant happens to share).
*/

beforeEach(function () {
    testTenant();
});

function otherTenantForValidation(): Tenant
{
    $tenant = Tenant::create(['name' => 'Initech', 'slug' => 'initech-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($tenant);

    return $tenant;
}

it('rejects creating a ticket against another tenant\'s category or priority', function () {
    $tenantB = otherTenantForValidation();
    $categoryB = TicketCategory::factory()->create(['tenant_id' => $tenantB->id]);
    $priorityB = TicketPriority::forTenant($tenantB)->where('slug', 'urgent')->firstOrFail();

    $customer = actingAsCustomer();

    $this->actingAs($customer, 'api')
        ->postJson('/api/v1/tickets', [
            'subject' => 'Cross-tenant category',
            'description' => 'Should be rejected.',
            'category_id' => $categoryB->id,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('category_id');

    $this->actingAs($customer, 'api')
        ->postJson('/api/v1/tickets', [
            'subject' => 'Cross-tenant priority',
            'description' => 'Should be rejected.',
            'priority_id' => $priorityB->id,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('priority_id');
});

it('rejects staff creating a ticket for another tenant\'s customer', function () {
    $tenantB = otherTenantForValidation();
    $customerB = Customer::factory()->create(['tenant_id' => $tenantB->id]);

    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')
        ->postJson('/api/v1/tickets', [
            'subject' => 'Cross-tenant customer',
            'description' => 'Should be rejected.',
            'customer_id' => $customerB->id,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('customer_id');
});

it('rejects assigning a ticket to another tenant\'s user', function () {
    $tenantB = otherTenantForValidation();
    $staffB = actingAsAgent($tenantB);

    $admin = actingAsAdministrator();
    $ticket = Ticket::factory()->create();

    $this->actingAs($admin, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/assign", ['assignee_id' => $staffB->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors('assignee_id');
});

it('rejects an SLA policy referencing another tenant\'s department', function () {
    $tenantB = otherTenantForValidation();
    $departmentB = Department::factory()->create(['tenant_id' => $tenantB->id]);

    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/sla-policies', [
            'name' => 'Cross-tenant SLA',
            'department_id' => $departmentB->id,
            'first_response_minutes' => 60,
            'resolution_minutes' => 480,
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('department_id');
});

it('rejects a staff user being linked to another tenant\'s department', function () {
    $tenantB = otherTenantForValidation();
    $departmentB = Department::factory()->create(['tenant_id' => $tenantB->id]);

    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/users', [
            'name' => 'New Agent',
            'email' => 'new-agent@example.com',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
            'role' => 'Agent',
            'department_ids' => [$departmentB->id],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('department_ids.0');
});

it('allows two tenants to independently use the same department code, role name and staff email', function () {
    $tenantB = otherTenantForValidation();
    app(TenantContext::class)->runAs($tenantB, function () {
        Department::create(['name' => 'Billing', 'code' => 'BILL', 'is_active' => true]);
    });

    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/departments', ['name' => 'Billing', 'code' => 'BILL'])
        ->assertCreated();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/roles', ['name' => 'Billing Specialist'])
        ->assertCreated();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/users', [
            'name' => 'Agent Smith',
            'email' => 'shared-staff@example.com',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
            'role' => 'Agent',
        ])
        ->assertCreated();
});
