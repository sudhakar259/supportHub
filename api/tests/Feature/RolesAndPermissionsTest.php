<?php

use App\Models\Role;

beforeEach(function () {
    testTenant();
});

it('lists roles with their permissions for an administrator', function () {
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/roles')
        ->assertOk()
        ->assertJsonFragment(['name' => 'Administrator'])
        ->assertJsonFragment(['name' => 'Customer']);
});

it('lists all permissions', function () {
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/permissions')
        ->assertOk()
        ->assertJsonFragment(['name' => 'tickets.view_internal_notes']);
});

it('creates a custom role with a permission subset', function () {
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/roles', [
            'name' => 'Billing Specialist',
            'permissions' => ['tickets.view', 'tickets.update'],
        ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Billing Specialist')
        ->assertJsonCount(2, 'data.permissions');
});

it('refuses to delete a seeded system role', function (string $roleName) {
    $admin = actingAsAdministrator();
    $role = Role::where('name', $roleName)->firstOrFail();

    $this->actingAs($admin, 'api')
        ->deleteJson("/api/v1/roles/{$role->id}")
        ->assertStatus(403);

    expect(Role::whereKey($role->id)->exists())->toBeTrue();
})->with(['Administrator', 'Department Manager', 'Senior Agent', 'Agent', 'Customer']);

it('still lets an administrator delete a custom role', function () {
    $admin = actingAsAdministrator();

    $roleId = $this->actingAs($admin, 'api')
        ->postJson('/api/v1/roles', ['name' => 'Temporary Reviewer', 'permissions' => ['tickets.view']])
        ->assertCreated()
        ->json('data.id');

    $this->actingAs($admin, 'api')
        ->deleteJson("/api/v1/roles/{$roleId}")
        ->assertOk();

    expect(Role::whereKey($roleId)->exists())->toBeFalse();
});

it('forbids a non-admin from viewing roles', function () {
    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')
        ->getJson('/api/v1/roles')
        ->assertStatus(403);
});
