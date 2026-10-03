<?php

use App\Models\Customer;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
});

it('registers a new customer and issues a token', function () {
    Notification::fake();
    $tenant = testTenant();

    $response = $this->postJson('/api/v1/auth/register', [
        'tenant' => $tenant->slug,
        'name' => 'Jamie Rivera',
        'email' => 'jamie@example.com',
        'password' => 'Secret123!',
        'password_confirmation' => 'Secret123!',
        'company_name' => 'Acme Corp',
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.user.email', 'jamie@example.com')
        ->assertJsonPath('data.token_type', 'Bearer')
        ->assertJsonStructure(['data' => ['token']]);

    $user = User::where('email', 'jamie@example.com')->first();
    expect($user)->not->toBeNull();
    expect($user->hasRole('Customer'))->toBeTrue();
    expect(Customer::where('user_id', $user->id)->exists())->toBeTrue();
});

it('rejects registration with a duplicate email', function () {
    $tenant = testTenant();
    User::factory()->create(['email' => 'taken@example.com']);

    $this->postJson('/api/v1/auth/register', [
        'tenant' => $tenant->slug,
        'name' => 'Someone',
        'email' => 'taken@example.com',
        'password' => 'Secret123!',
        'password_confirmation' => 'Secret123!',
    ])->assertStatus(422)
        ->assertJsonPath('success', false)
        ->assertJsonPath('message', 'Validation failed.')
        ->assertJsonValidationErrors('email');
});

it('logs in with valid credentials and rejects invalid ones', function () {
    $user = User::factory()->create([
        'email' => 'login@example.com',
        'password' => Hash::make('correct-password'),
    ]);
    $user->assignRole('Customer');

    $this->postJson('/api/v1/auth/login', [
        'email' => 'login@example.com',
        'password' => 'wrong-password',
    ])->assertStatus(422)->assertJsonPath('success', false);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'login@example.com',
        'password' => 'correct-password',
    ]);

    $response->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.user.email', 'login@example.com');

    $user->refresh();
    expect($user->last_login_at)->not->toBeNull();
});

it('rejects login for a deactivated account', function () {
    User::factory()->create([
        'email' => 'inactive@example.com',
        'password' => Hash::make('password'),
        'is_active' => false,
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'inactive@example.com',
        'password' => 'password',
    ])->assertStatus(403)->assertJsonPath('success', false);
});

it('returns the authenticated user from /auth/me', function () {
    $user = User::factory()->create();
    $user->assignRole('Agent');

    $this->actingAs($user, 'api')
        ->getJson('/api/v1/auth/me')
        ->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.roles.0', 'Agent');
});

it('rejects unauthenticated access to /auth/me', function () {
    $this->getJson('/api/v1/auth/me')
        ->assertStatus(401)
        ->assertJsonPath('success', false)
        ->assertJsonPath('message', 'Unauthenticated.');
});

it('revokes the current token on logout', function () {
    $user = User::factory()->create();
    $newToken = $user->createToken('test');
    $tokenId = $newToken->accessToken->id;

    $this->withHeader('Authorization', "Bearer {$newToken->plainTextToken}")
        ->postJson('/api/v1/auth/logout')
        ->assertOk()
        ->assertJsonPath('success', true);

    $this->assertDatabaseMissing('personal_access_tokens', ['id' => $tokenId]);
});

it('always returns a generic message for forgot-password regardless of whether the email exists', function () {
    Notification::fake();

    $existing = User::factory()->create(['email' => 'exists@example.com']);

    $responseExisting = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'exists@example.com']);
    $responseMissing = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'missing@example.com']);

    expect($responseExisting->json('message'))->toBe($responseMissing->json('message'));
    $responseExisting->assertOk();
    $responseMissing->assertOk();
});
