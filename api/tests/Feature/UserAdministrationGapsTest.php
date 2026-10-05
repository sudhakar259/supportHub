<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    testTenant();
});

it('lets an administrator create another administrator', function () {
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/users', [
            'name' => 'Second Admin',
            'email' => 'second.admin@example.com',
            'role' => 'Administrator',
        ])
        ->assertCreated();

    expect(User::where('email', 'second.admin@example.com')->first()?->hasRole('Administrator'))->toBeTrue();
});

it('soft deletes a deleted user and keeps the row', function () {
    $admin = actingAsAdministrator();
    $agent = User::factory()->create(['tenant_id' => testTenant()->id]);
    $agent->assignRole('Agent');

    $this->actingAs($admin, 'api')
        ->deleteJson("/api/v1/users/{$agent->id}")
        ->assertOk();

    expect(User::withTrashed()->find($agent->id)?->deleted_at)->not->toBeNull();
    expect(User::find($agent->id))->toBeNull();
});
