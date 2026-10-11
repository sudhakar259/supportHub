<?php

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    (new RolesAndPermissionsSeeder)->run();
});

const GOOD_PASSWORD = 'Str0ng!Passw0rd#1';

it('creates a platform administrator who can then sign in', function () {
    $this->artisan('desknu:create-platform-admin', ['email' => 'Boss@Example.com', '--name' => 'The Boss'])
        ->expectsQuestion('Password (min 10 characters, upper and lower case, a number and a symbol)', GOOD_PASSWORD)
        ->expectsQuestion('Repeat the password', GOOD_PASSWORD)
        ->expectsOutputToContain('boss@example.com created')
        ->assertSuccessful();

    $admin = User::withoutGlobalScopes()->where('email', 'boss@example.com')->first();
    expect($admin->tenant_id)->toBeNull()
        ->and($admin->name)->toBe('The Boss')
        ->and($admin->is_active)->toBeTrue()
        ->and($admin->email_verified_at)->not->toBeNull()
        ->and($admin->hasRole('Platform Admin'))->toBeTrue();

    $this->postJson('/api/v1/auth/login', ['email' => 'boss@example.com', 'password' => GOOD_PASSWORD])
        ->assertOk()->assertJsonStructure(['data' => ['token']]);
});

it('refuses a weak password and creates nothing', function () {
    $this->artisan('desknu:create-platform-admin', ['email' => 'boss@example.com'])
        ->expectsQuestion('Password (min 10 characters, upper and lower case, a number and a symbol)', 'password')
        ->assertFailed();

    expect(User::withoutGlobalScopes()->where('email', 'boss@example.com')->exists())->toBeFalse();
});

it('refuses when the two passwords differ', function () {
    $this->artisan('desknu:create-platform-admin', ['email' => 'boss@example.com'])
        ->expectsQuestion('Password (min 10 characters, upper and lower case, a number and a symbol)', GOOD_PASSWORD)
        ->expectsQuestion('Repeat the password', 'Different!Passw0rd#2')
        ->expectsOutputToContain('do not match')
        ->assertFailed();

    expect(User::withoutGlobalScopes()->where('email', 'boss@example.com')->exists())->toBeFalse();
});

it('refuses an invalid email and a duplicate', function () {
    $this->artisan('desknu:create-platform-admin', ['email' => 'not-an-email'])->assertFailed();

    $this->artisan('desknu:create-platform-admin', ['email' => 'boss@example.com'])
        ->expectsQuestion('Password (min 10 characters, upper and lower case, a number and a symbol)', GOOD_PASSWORD)
        ->expectsQuestion('Repeat the password', GOOD_PASSWORD)
        ->assertSuccessful();

    $this->artisan('desknu:create-platform-admin', ['email' => 'boss@example.com'])
        ->expectsOutputToContain('already exists')
        ->assertFailed();
});

it('keeps the previous command name available for existing deployment scripts', function () {
    $this->artisan('supporthub:create-platform-admin', ['email' => 'not-an-email'])
        ->assertFailed();
});
