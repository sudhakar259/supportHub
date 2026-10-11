<?php

use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantProvisioningService;
use App\Support\Totp;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->tenant = testTenant();
});

function makeUser(string $role = 'Agent', array $attrs = []): User
{
    $tenant = testTenant();

    return app(\App\Support\TenantContext::class)->runAs($tenant, function () use ($role, $attrs, $tenant) {
        $user = User::factory()->create($attrs + ['tenant_id' => $tenant->id, 'password' => 'Correct!Horse9', 'email_verified_at' => now()]);
        $user->assignRole($role);

        return $user;
    });
}

function attemptLogin($test, User $user, string $password = 'Correct!Horse9')
{
    return $test->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => $password, 'tenant' => $user->tenant->slug]);
}

/** Enables 2FA the way a person would, and returns [secret, recovery codes]. */
function enableTwoFactor($test, User $user): array
{
    $test->actingAs($user, 'api');
    $secret = $test->postJson('/api/v1/auth/two-factor/setup', ['password' => 'Correct!Horse9'])->assertOk()->json('data.secret');
    $codes = $test->postJson('/api/v1/auth/two-factor/confirm', ['code' => Totp::code($secret, Totp::currentStep())])->assertOk()->json('data.recovery_codes');
    app('auth')->forgetGuards();

    return [$secret, $codes];
}

// ---- Lockout -----------------------------------------------------------------------------

it('locks an account after five wrong passwords, even for the right password afterwards', function () {
    $user = makeUser();

    foreach (range(1, 4) as $_) {
        attemptLogin($this, $user, 'wrong')->assertStatus(422)->assertJsonPath('errors.email.0', 'The provided credentials are incorrect.');
    }
    attemptLogin($this, $user, 'wrong')->assertStatus(422); // the 5th wrong one locks

    $locked = attemptLogin($this, $user)->assertStatus(423);
    expect($locked->json('message'))->toContain('locked')
        ->and($locked->json('retry_after_seconds'))->toBeGreaterThan(800)->toBeLessThanOrEqual(900)
        ->and($locked->json('data.token'))->toBeNull();
});

it('lets the person back in once the lock has run out, and clears the count', function () {
    $user = makeUser();
    foreach (range(1, 5) as $_) {
        attemptLogin($this, $user, 'wrong');
    }
    attemptLogin($this, $user)->assertStatus(423);

    $this->travel(16)->minutes();

    attemptLogin($this, $user)->assertOk()->assertJsonStructure(['data' => ['token']]);
    $user->refresh();
    expect($user->failed_login_attempts)->toBe(0)->and($user->locked_until)->toBeNull();
});

it('does not lock an account whose failures are broken up by a successful sign-in', function () {
    $user = makeUser();

    foreach (range(1, 4) as $_) {
        attemptLogin($this, $user, 'wrong');
    }
    attemptLogin($this, $user)->assertOk();
    foreach (range(1, 4) as $_) {
        attemptLogin($this, $user, 'wrong');
    }

    attemptLogin($this, $user)->assertOk();
});

it('lets an administrator unlock a locked user, and nobody else', function () {
    $user = makeUser();
    $admin = makeUser('Administrator');
    $agent = makeUser();
    foreach (range(1, 5) as $_) {
        attemptLogin($this, $user, 'wrong');
    }
    attemptLogin($this, $user)->assertStatus(423);

    $this->actingAs($agent, 'api')->postJson("/api/v1/users/{$user->id}/unlock")->assertForbidden();
    $this->app['auth']->forgetGuards();

    $this->actingAs($admin, 'api')->postJson("/api/v1/users/{$user->id}/unlock")->assertOk()->assertJsonPath('data.locked_until', null);
    $this->app['auth']->forgetGuards();

    attemptLogin($this, $user)->assertOk();
});

it('shows an administrator who is locked out', function () {
    $user = makeUser();
    $admin = makeUser('Administrator');
    foreach (range(1, 5) as $_) {
        attemptLogin($this, $user, 'wrong');
    }

    $this->actingAs($admin, 'api')->getJson("/api/v1/users/{$user->id}")->assertOk()->assertJson(fn ($json) => $json->has('data.locked_until')->etc());
});

it('clears the lock when the password is reset from the emailed link', function () {
    Notification::fake();
    $user = makeUser();
    foreach (range(1, 5) as $_) {
        attemptLogin($this, $user, 'wrong');
    }

    $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email, 'tenant' => $user->tenant->slug])->assertOk();
    $token = null;
    Notification::assertSentTo($user, ResetPassword::class, function ($n) use (&$token) {
        $token = $n->token;

        return true;
    });

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => $token, 'email' => $user->email, 'tenant' => $user->tenant->slug,
        'password' => 'N3w!Passw0rd#xyz', 'password_confirmation' => 'N3w!Passw0rd#xyz',
    ])->assertOk();

    attemptLogin($this, $user, 'N3w!Passw0rd#xyz')->assertOk();
});

it('keeps one workspace\'s lockout from touching the same email in another workspace', function () {
    $user = makeUser(attrs: ['email' => 'shared@example.com']);
    $other = Tenant::create(['name' => 'Other Org', 'slug' => 'other-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($other);
    $twin = app(\App\Support\TenantContext::class)->runAs($other, function () use ($other) {
        $u = User::factory()->create(['tenant_id' => $other->id, 'email' => 'shared@example.com', 'password' => 'Other!Pass99x', 'email_verified_at' => now()]);
        $u->assignRole('Agent');

        return $u;
    });

    foreach (range(1, 5) as $_) {
        attemptLogin($this, $user, 'wrong');
    }

    attemptLogin($this, $user)->assertStatus(423);
    attemptLogin($this, $twin, 'Other!Pass99x')->assertOk();
});

// ---- Two-factor setup ----------------------------------------------------------------------

it('turns two-factor on only after a valid code from the app, then shows recovery codes once', function () {
    $user = makeUser();
    $this->actingAs($user, 'api');

    $setup = $this->postJson('/api/v1/auth/two-factor/setup', ['password' => 'Correct!Horse9'])->assertOk();
    $secret = $setup->json('data.secret');
    expect($setup->json('data.otpauth_url'))->toStartWith('otpauth://totp/')->toContain("secret={$secret}");

    // Scanned but not confirmed: sign-in is unchanged.
    expect($user->fresh()->hasTwoFactorEnabled())->toBeFalse();

    $this->postJson('/api/v1/auth/two-factor/confirm', ['code' => '000000'])->assertStatus(422)->assertJsonValidationErrors('code');

    $confirmed = $this->postJson('/api/v1/auth/two-factor/confirm', ['code' => Totp::code($secret, Totp::currentStep())])->assertOk();
    expect($confirmed->json('data.recovery_codes'))->toHaveCount(8)
        ->and($user->fresh()->hasTwoFactorEnabled())->toBeTrue();
});

it('needs the current password to start setup, and refuses it when already on', function () {
    $user = makeUser();
    $this->actingAs($user, 'api');

    $this->postJson('/api/v1/auth/two-factor/setup', ['password' => 'nope'])->assertStatus(422)->assertJsonValidationErrors('password');

    enableTwoFactor($this, $user);
    $this->actingAs($user->fresh(), 'api')->postJson('/api/v1/auth/two-factor/setup', ['password' => 'Correct!Horse9'])->assertStatus(422);
});

it('stores the secret encrypted and never returns it or the recovery codes afterwards', function () {
    $user = makeUser();
    [$secret, $codes] = enableTwoFactor($this, $user);

    $raw = \Illuminate\Support\Facades\DB::table('users')->where('id', $user->id)->first();
    expect($raw->two_factor_secret)->not->toContain($secret)
        ->and($raw->two_factor_recovery_codes)->not->toContain($codes[0]);

    $me = $this->actingAs($user->fresh(), 'api')->getJson('/api/v1/auth/me')->assertOk();
    expect($me->getContent())->not->toContain($secret)->not->toContain($codes[0])
        ->and($me->json('data.two_factor_enabled'))->toBeTrue()
        ->and($me->json('data.two_factor_recovery_codes_remaining'))->toBe(8);
});

// ---- Two-factor sign-in --------------------------------------------------------------------

it('asks for a code after the password and only then issues a token', function () {
    $user = makeUser();
    [$secret] = enableTwoFactor($this, $user);

    $first = attemptLogin($this, $user)->assertOk();
    expect($first->json('data.two_factor_required'))->toBeTrue()
        ->and($first->json('data.token'))->toBeNull()
        ->and($first->json('data.challenge_token'))->not->toBeEmpty();

    $done = $this->postJson('/api/v1/auth/two-factor/challenge', [
        'challenge_token' => $first->json('data.challenge_token'),
        // Setup already used this 30-second code, so a person types the next one.
        'code' => Totp::code($secret, Totp::currentStep() + 1),
    ])->assertOk();

    expect($done->json('data.token'))->not->toBeEmpty()->and($done->json('data.user.email'))->toBe($user->email);

    $this->app['auth']->forgetGuards();
    $this->withToken($done->json('data.token'))->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('data.id', $user->id);
});

it('does not accept the same code twice', function () {
    $user = makeUser();
    [$secret] = enableTwoFactor($this, $user);
    $code = Totp::code($secret, Totp::currentStep() + 1);

    $one = attemptLogin($this, $user)->json('data.challenge_token');
    $this->postJson('/api/v1/auth/two-factor/challenge', ['challenge_token' => $one, 'code' => $code])->assertOk();

    $two = attemptLogin($this, $user)->json('data.challenge_token');
    $this->postJson('/api/v1/auth/two-factor/challenge', ['challenge_token' => $two, 'code' => $code])->assertStatus(422)->assertJsonValidationErrors('code');
});

it('rejects a wrong code, and locks the account after five of them', function () {
    $user = makeUser();
    enableTwoFactor($this, $user);
    $token = attemptLogin($this, $user)->json('data.challenge_token');

    foreach (range(1, 4) as $_) {
        $this->postJson('/api/v1/auth/two-factor/challenge', ['challenge_token' => $token, 'code' => '000000'])->assertStatus(422);
    }
    $this->postJson('/api/v1/auth/two-factor/challenge', ['challenge_token' => $token, 'code' => '000000'])->assertStatus(423);

    attemptLogin($this, $user)->assertStatus(423);
});

it('accepts each recovery code once', function () {
    $user = makeUser();
    [, $codes] = enableTwoFactor($this, $user);

    $token = attemptLogin($this, $user)->json('data.challenge_token');
    $this->postJson('/api/v1/auth/two-factor/challenge', ['challenge_token' => $token, 'recovery_code' => strtoupper($codes[0])])->assertOk()->assertJsonStructure(['data' => ['token']]);

    $again = attemptLogin($this, $user)->json('data.challenge_token');
    $this->postJson('/api/v1/auth/two-factor/challenge', ['challenge_token' => $again, 'recovery_code' => $codes[0]])->assertStatus(422)->assertJsonValidationErrors('recovery_code');

    expect($user->fresh()->two_factor_recovery_codes)->toHaveCount(7);
});

it('expires the challenge after a few minutes and after one successful use', function () {
    $user = makeUser();
    [$secret] = enableTwoFactor($this, $user);

    $token = attemptLogin($this, $user)->json('data.challenge_token');
    $this->travel(6)->minutes();
    $this->postJson('/api/v1/auth/two-factor/challenge', ['challenge_token' => $token, 'code' => Totp::code($secret, Totp::currentStep())])
        ->assertStatus(422)->assertJsonPath('errors.code.0', 'This sign-in has expired. Please sign in again.');

    $this->travelBack();
    $fresh = attemptLogin($this, $user)->json('data.challenge_token');
    $code = Totp::code($secret, Totp::currentStep() + 1);
    $this->postJson('/api/v1/auth/two-factor/challenge', ['challenge_token' => $fresh, 'code' => $code])->assertOk();
    $this->postJson('/api/v1/auth/two-factor/challenge', ['challenge_token' => $fresh, 'code' => Totp::code($secret, Totp::currentStep() + 1)])->assertStatus(422);
});

it('rejects a made-up challenge token', function () {
    $this->postJson('/api/v1/auth/two-factor/challenge', ['challenge_token' => 'not-a-real-token', 'code' => '123456'])->assertStatus(422);
});

// ---- Turning it off / recovery ------------------------------------------------------------

it('needs the password and a code to turn two-factor off, after which sign-in is plain again', function () {
    $user = makeUser();
    [$secret] = enableTwoFactor($this, $user);
    $this->actingAs($user->fresh(), 'api');

    $this->postJson('/api/v1/auth/two-factor/disable', ['password' => 'wrong', 'code' => Totp::code($secret, Totp::currentStep())])->assertStatus(422);
    $this->postJson('/api/v1/auth/two-factor/disable', ['password' => 'Correct!Horse9', 'code' => '000000'])->assertStatus(422);
    $this->postJson('/api/v1/auth/two-factor/disable', ['password' => 'Correct!Horse9'])->assertStatus(422);

    $this->postJson('/api/v1/auth/two-factor/disable', ['password' => 'Correct!Horse9', 'code' => Totp::code($secret, Totp::currentStep() + 1)])->assertOk();
    $this->app['auth']->forgetGuards();

    attemptLogin($this, $user)->assertOk()->assertJsonStructure(['data' => ['token']]);
    expect($user->fresh()->two_factor_secret)->toBeNull();
});

it('replaces all recovery codes on request, so the old ones stop working', function () {
    $user = makeUser();
    [$secret, $old] = enableTwoFactor($this, $user);

    $new = $this->actingAs($user->fresh(), 'api')
        ->postJson('/api/v1/auth/two-factor/recovery-codes', ['password' => 'Correct!Horse9', 'code' => Totp::code($secret, Totp::currentStep() + 1)])
        ->assertOk()->json('data.recovery_codes');
    $this->app['auth']->forgetGuards();

    expect($new)->toHaveCount(8)->and(array_intersect($new, $old))->toBe([]);

    $token = attemptLogin($this, $user)->json('data.challenge_token');
    $this->postJson('/api/v1/auth/two-factor/challenge', ['challenge_token' => $token, 'recovery_code' => $old[0]])->assertStatus(422);
    $this->postJson('/api/v1/auth/two-factor/challenge', ['challenge_token' => $token, 'recovery_code' => $new[0]])->assertOk();
});

it('lets an administrator reset someone\'s two-factor and signs them out, but not their own', function () {
    $user = makeUser();
    $admin = makeUser('Administrator');
    $agent = makeUser();
    enableTwoFactor($this, $user);
    $user->createToken('old-session');

    $this->actingAs($agent, 'api')->deleteJson("/api/v1/users/{$user->id}/two-factor")->assertForbidden();
    $this->actingAs($admin, 'api')->deleteJson("/api/v1/users/{$admin->id}/two-factor")->assertForbidden();
    $this->actingAs($admin, 'api')->deleteJson("/api/v1/users/{$user->id}/two-factor")->assertOk();

    $user->refresh();
    expect($user->hasTwoFactorEnabled())->toBeFalse()->and($user->tokens()->count())->toBe(0);
    $this->app['auth']->forgetGuards();
    attemptLogin($this, $user)->assertOk()->assertJsonStructure(['data' => ['token']]);
});

it('hides one person\'s security status from other non-administrators', function () {
    $user = makeUser();
    $agent = makeUser();
    enableTwoFactor($this, $user);

    $seen = $this->actingAs($agent, 'api')->getJson("/api/v1/users/{$user->id}");
    if ($seen->status() === 200) {
        expect($seen->json('data'))->not->toHaveKey('two_factor_enabled');
    } else {
        $seen->assertForbidden();
    }
});
