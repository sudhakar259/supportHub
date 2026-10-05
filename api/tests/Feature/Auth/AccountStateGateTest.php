<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Password;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    testTenant();
});

it('rejects a still-valid token once its user has been deactivated', function () {
    $tenant = testTenant();
    $user = User::factory()->create(['tenant_id' => $tenant->id, 'is_active' => false]);
    $user->assignRole('Administrator');

    $this->actingAs($user, 'api')
        ->getJson('/api/v1/tickets')
        ->assertStatus(401)
        ->assertJsonPath('message', 'This account has been deactivated.');
});

it('keeps tenant routes closed until the owner verifies their email', function () {
    $tenant = testTenant();
    $user = User::factory()->unverified()->create(['tenant_id' => $tenant->id]);
    $user->assignRole('Administrator');

    $this->actingAs($user, 'api')
        ->getJson('/api/v1/tickets')
        ->assertStatus(403)
        ->assertJsonPath('message', 'Verify your email address to continue.');
});

it('refuses login for a suspended tenant instead of issuing a token', function () {
    $tenant = testTenant();
    User::factory()->create(['tenant_id' => $tenant->id, 'email' => 'owner@suspended.test']);
    $tenant->update(['status' => 'suspended']);

    $this->postJson('/api/v1/auth/login', ['email' => 'owner@suspended.test', 'password' => 'password'])
        ->assertStatus(403)
        ->assertJsonPath('message', 'This tenant account is suspended or no longer active.')
        ->assertJsonMissingPath('data.token');
});

it('marks the address verified when a password reset completes from the emailed link', function () {
    $tenant = testTenant();
    $user = User::factory()->unverified()->create([
        'tenant_id' => $tenant->id,
        'email' => 'invitee@example.com',
    ]);
    $token = Password::broker()->createToken($user);

    $this->postJson('/api/v1/auth/reset-password', [
        'email' => 'invitee@example.com',
        'token' => $token,
        'password' => 'NewSecret123!',
        'password_confirmation' => 'NewSecret123!',
    ])->assertOk();

    expect($user->fresh()->email_verified_at)->not->toBeNull();
});
