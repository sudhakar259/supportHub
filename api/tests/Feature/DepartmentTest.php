<?php

use App\Models\Department;

beforeEach(function () {
    testTenant();
});

it('allows an administrator to create a department', function () {
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/departments', [
            'name' => 'Billing',
            'code' => 'BILL',
            'description' => 'Invoices and payments',
        ])
        ->assertCreated()
        ->assertJsonPath('data.code', 'BILL');

    $this->assertDatabaseHas('departments', ['code' => 'BILL']);
});

it('forbids an agent from creating a department', function () {
    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')
        ->postJson('/api/v1/departments', ['name' => 'Billing', 'code' => 'BILL'])
        ->assertStatus(403)
        ->assertJsonPath('success', false);
});

it('forbids a customer from listing departments', function () {
    $customer = actingAsCustomer();

    $this->actingAs($customer, 'api')
        ->getJson('/api/v1/departments')
        ->assertStatus(403);
});

it('validates required fields when creating a department', function () {
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/departments', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['name', 'code']);
});

it('rejects a duplicate department code', function () {
    $admin = actingAsAdministrator();
    Department::factory()->create(['code' => 'BILL']);

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/departments', ['name' => 'Billing Two', 'code' => 'BILL'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['code']);
});

it('assigns and removes an agent from a department', function () {
    $admin = actingAsAdministrator();
    $department = Department::factory()->create();
    $agent = actingAsAgent();

    $this->actingAs($admin, 'api')
        ->postJson("/api/v1/departments/{$department->id}/users", ['user_id' => $agent->id])
        ->assertOk();

    expect($department->users()->where('user_id', $agent->id)->exists())->toBeTrue();

    $this->actingAs($admin, 'api')
        ->deleteJson("/api/v1/departments/{$department->id}/users/{$agent->id}")
        ->assertOk();

    expect($department->users()->where('user_id', $agent->id)->exists())->toBeFalse();
});

it('soft deletes a department', function () {
    $admin = actingAsAdministrator();
    $department = Department::factory()->create();

    $this->actingAs($admin, 'api')
        ->deleteJson("/api/v1/departments/{$department->id}")
        ->assertOk();

    $this->assertSoftDeleted('departments', ['id' => $department->id]);
});
