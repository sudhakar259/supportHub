<?php

use App\Models\Customer;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioningService;

beforeEach(function () {
    testTenant();
});

it('lets an admin create a customer with an underlying user account', function () {
    $admin = actingAsAdministrator();

    $response = $this->actingAs($admin, 'api')
        ->postJson('/api/v1/customers', [
            'name' => 'New Customer',
            'email' => 'newcustomer@example.com',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
            'company_name' => 'Acme Corp',
            'customer_type' => 'business',
        ])
        ->assertCreated()
        ->assertJsonPath('data.company_name', 'Acme Corp');

    $this->assertDatabaseHas('users', ['email' => 'newcustomer@example.com']);
    $this->assertDatabaseHas('customers', ['company_name' => 'Acme Corp']);
});

it('lets a customer view and update their own profile', function () {
    $customer = Customer::factory()->create();

    $this->actingAs($customer->user, 'api')
        ->putJson("/api/v1/customers/{$customer->id}", ['company_name' => 'Updated Co'])
        ->assertOk()
        ->assertJsonPath('data.company_name', 'Updated Co');
});

it('lets an admin set an external_id but silently ignores it on customer self-update', function () {
    $admin = actingAsAdministrator();

    $response = $this->actingAs($admin, 'api')
        ->postJson('/api/v1/customers', [
            'name' => 'Mapped Customer',
            'email' => 'mapped@example.com',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
            'external_id' => 'CRM-001',
        ])
        ->assertCreated()
        ->assertJsonPath('data.external_id', 'CRM-001');

    $customerId = $response->json('data.id');
    $customer = Customer::find($customerId);
    $customer->user->markEmailAsVerified();

    $this->actingAs($customer->user, 'api')
        ->putJson("/api/v1/customers/{$customerId}", ['external_id' => 'HACKED'])
        ->assertOk()
        ->assertJsonPath('data.external_id', 'CRM-001');
});

it('allows the same email to be used for admin-created customers in different tenants', function () {
    $tenantA = testTenant();
    $adminA = actingAsAdministrator($tenantA);

    $this->actingAs($adminA, 'api')
        ->postJson('/api/v1/customers', [
            'name' => 'Shared Email Customer',
            'email' => 'shared@example.com',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
        ])->assertCreated();

    $tenantB = Tenant::create(['name' => 'Other Org', 'slug' => 'other-org-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($tenantB);
    $adminB = actingAsAdministrator($tenantB);

    $this->actingAs($adminB, 'api')
        ->postJson('/api/v1/customers', [
            'name' => 'Shared Email Customer',
            'email' => 'shared@example.com',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
        ])->assertCreated();

    expect(User::withoutTenantScope()->where('email', 'shared@example.com')->count())->toBe(2);
});

it('forbids a customer from viewing another customer\'s profile', function () {
    $customerA = Customer::factory()->create();
    $customerB = Customer::factory()->create();

    $this->actingAs($customerA->user, 'api')
        ->getJson("/api/v1/customers/{$customerB->id}")
        ->assertStatus(403);
});

it('filters customers by type', function () {
    $admin = actingAsAdministrator();
    Customer::factory()->create(['customer_type' => 'vip']);
    Customer::factory()->create(['customer_type' => 'individual']);

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/customers?filter[customer_type]=vip')
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

it('creates several customers in one tenant when external_id is omitted', function () {
    $admin = actingAsAdministrator();

    foreach (['first', 'second'] as $name) {
        $this->actingAs($admin, 'api')
            ->postJson('/api/v1/customers', [
                'name' => "Customer {$name}",
                'email' => "{$name}@example.com",
                'password' => 'Secret123!',
                'password_confirmation' => 'Secret123!',
            ])
            ->assertCreated()
            ->assertJsonPath('data.external_id', null);
    }
});
