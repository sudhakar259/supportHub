<?php

use App\Models\Customer;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
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
