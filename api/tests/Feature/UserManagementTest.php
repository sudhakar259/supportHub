<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

it('lets an administrator create a staff user with a role', function () {
    $admin = actingAsAdministrator();

    $response = $this->actingAs($admin, 'api')
        ->postJson('/api/v1/users', [
            'name' => 'New Agent',
            'email' => 'newagent@example.com',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
            'role' => 'Agent',
        ])
        ->assertCreated()
        ->assertJsonPath('data.roles.0', 'Agent');

    $this->assertDatabaseHas('users', ['email' => 'newagent@example.com']);
});

it('rejects creating a staff user with the Customer role via the staff endpoint', function () {
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/users', [
            'name' => 'Should Fail',
            'email' => 'shouldfail@example.com',
            'password' => 'Secret123!',
            'password_confirmation' => 'Secret123!',
            'role' => 'Customer',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['role']);
});

it('lets a user update their own profile but not is_active', function () {
    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')
        ->putJson("/api/v1/users/{$agent->id}", [
            'name' => 'Renamed Agent',
            'is_active' => false,
        ])
        ->assertOk()
        ->assertJsonPath('data.name', 'Renamed Agent');

    expect($agent->fresh()->is_active)->toBeTrue();
});

it('forbids a user from updating someone else\'s profile', function () {
    $agent = actingAsAgent();
    $other = User::factory()->create();

    $this->actingAs($agent, 'api')
        ->putJson("/api/v1/users/{$other->id}", ['name' => 'Hacked'])
        ->assertStatus(403);
});

it('lets an administrator sync roles for a user', function () {
    $admin = actingAsAdministrator();
    $agent = actingAsAgent();

    $this->actingAs($admin, 'api')
        ->putJson("/api/v1/users/{$agent->id}/roles", ['roles' => ['Senior Agent']])
        ->assertOk()
        ->assertJsonPath('data.roles.0', 'Senior Agent');

    expect($agent->fresh()->hasRole('Agent'))->toBeFalse();
    expect($agent->fresh()->hasRole('Senior Agent'))->toBeTrue();
});

it('prevents an administrator from deleting their own account', function () {
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->deleteJson("/api/v1/users/{$admin->id}")
        ->assertStatus(403);
});
