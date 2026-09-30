<?php

beforeEach(function () {
    $this->seed(\Database\Seeders\RolesAndPermissionsSeeder::class);
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

it('refuses to delete the built-in Administrator role', function () {
    $admin = actingAsAdministrator();
    $role = \Spatie\Permission\Models\Role::where('name', 'Administrator')->first();

    $this->actingAs($admin, 'api')
        ->deleteJson("/api/v1/roles/{$role->id}")
        ->assertStatus(403);
});

it('forbids a non-admin from viewing roles', function () {
    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')
        ->getJson('/api/v1/roles')
        ->assertStatus(403);
});
