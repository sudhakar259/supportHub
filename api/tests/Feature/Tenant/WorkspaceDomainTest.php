<?php

use App\Models\Tenant;
use App\Models\User;
use App\Services\TwoFactorService;
use App\Support\TenantContext;
use App\Support\WorkspaceDomains;
use Database\Seeders\MembershipPlanSeeder;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Env;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Spatie\Permission\Models\Role;

beforeEach(function () {
    config(['workspaces.domain' => 'supporthub.com', 'workspaces.scheme' => 'https', 'workspaces.port' => null]);
    $this->tenant = testTenant();
});

function workspaceDomainUser(Tenant $tenant, array $attributes = []): User
{
    return app(TenantContext::class)->runAs($tenant, function () use ($tenant, $attributes) {
        $user = User::factory()->create($attributes + ['tenant_id' => $tenant->id, 'password' => 'Correct!Horse9', 'email_verified_at' => now()]);
        $user->assignRole('Administrator');

        return $user;
    });
}

function workspaceDomainColdRequest(): void
{
    app(TenantContext::class)->clear();
    app('auth')->forgetGuards();
}

it('uses the tenant hostname to choose an account when two tenants share credentials', function () {
    $other = Tenant::create(['name' => 'Other', 'slug' => 'other-workspace', 'status' => 'active']);
    User::factory()->create(['tenant_id' => $other->id, 'email' => 'shared@example.test', 'password' => 'Correct!Horse9']);
    $user = workspaceDomainUser($this->tenant, ['email' => 'shared@example.test']);
    workspaceDomainColdRequest();

    $this->postJson('https://'.$this->tenant->slug.'.supporthub.com/api/v1/auth/login', [
        'email' => $user->email, 'password' => 'Correct!Horse9',
    ])->assertOk()->assertJsonPath('data.user.id', $user->id)
        ->assertJsonPath('data.user.tenant.workspace_url', 'https://'.$this->tenant->slug.'.supporthub.com');
});

it('scopes central API login using the workspace header and rejects an override', function () {
    $user = workspaceDomainUser($this->tenant);
    workspaceDomainColdRequest();
    $this->withHeader('X-Workspace', $this->tenant->slug)->postJson('/api/v1/auth/login', [
        'email' => $user->email, 'password' => 'Correct!Horse9',
    ])->assertOk()->assertJsonPath('data.user.id', $user->id);
    workspaceDomainColdRequest();
    $this->postJson('/api/v1/auth/login', ['email' => $user->email, 'password' => 'Correct!Horse9', 'tenant' => 'another-tenant'])
        ->assertUnprocessable()->assertJsonValidationErrors('tenant');
});

it('refuses a hostname and header that name different workspaces', function () {
    $this->withHeader('X-Workspace', 'other-workspace')
        ->getJson('https://'.$this->tenant->slug.'.supporthub.com/api/v1/membership-plans')->assertForbidden();
});

it('cannot restore a tenant session through another workspace', function () {
    $other = Tenant::create(['name' => 'Other', 'slug' => 'other-workspace', 'status' => 'active']);
    $user = workspaceDomainUser($this->tenant);
    $token = $user->createToken('test')->plainTextToken;
    workspaceDomainColdRequest();

    $this->withHeaders(['Authorization' => 'Bearer '.$token, 'X-Workspace' => $other->slug])
        ->getJson('/api/v1/auth/me')->assertForbidden();
    workspaceDomainColdRequest();
    $this->withHeader('X-Workspace', $this->tenant->slug)->getJson('/api/v1/auth/me')
        ->assertOk()->assertJsonPath('data.tenant.slug', $this->tenant->slug);
});

it('rejects a mismatched workspace before tenant route model binding', function () {
    $other = Tenant::create(['name' => 'Other', 'slug' => 'other-workspace', 'status' => 'active']);
    $user = workspaceDomainUser($this->tenant);
    $token = $user->createToken('test')->plainTextToken;
    workspaceDomainColdRequest();

    $this->withHeaders(['Authorization' => 'Bearer '.$token, 'X-Workspace' => $other->slug])
        ->getJson('/api/v1/tickets/999999')->assertForbidden();
});

it('does not use a workspace address to grant a platform administrator tenant access', function () {
    app(TenantContext::class)->runAs(null, fn () => Role::findOrCreate('Platform Admin', 'api'));
    $user = actingAsPlatformAdmin();
    $token = $user->createToken('test')->plainTextToken;
    workspaceDomainColdRequest();
    $this->withHeaders(['Authorization' => 'Bearer '.$token, 'X-Workspace' => $this->tenant->slug])
        ->getJson('/api/v1/auth/me')->assertForbidden();
});

it('returns a helpful error for a missing workspace', function () {
    $this->withHeader('X-Workspace', 'missing-workspace')->postJson('/api/v1/auth/login', [
        'email' => 'person@example.test', 'password' => 'Correct!Horse9',
    ])->assertNotFound()->assertJsonPath('message', 'This workspace could not be found.');
});

it('rejects invalid workspace headers', function (string $slug) {
    $this->withHeader('X-Workspace', $slug)->getJson('/api/v1/membership-plans')->assertBadRequest();
})->with(['api', 'under_score', '-bad', 'bad-', 'nested.workspace', str_repeat('a', 64)]);

it('scopes emailed password recovery to the workspace account', function () {
    Notification::fake();
    $other = Tenant::create(['name' => 'Other', 'slug' => 'other-workspace', 'status' => 'active']);
    $otherUser = User::factory()->create(['tenant_id' => $other->id, 'email' => 'shared@example.test']);
    $user = workspaceDomainUser($this->tenant, ['email' => 'shared@example.test']);
    workspaceDomainColdRequest();

    $this->withHeader('X-Workspace', $this->tenant->slug)->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])->assertOk();
    Notification::assertSentTo($user, ResetPassword::class, function ($notification) use ($user) {
        expect($notification->toMail($user)->actionUrl)->toStartWith('https://'.$this->tenant->slug.'.supporthub.com/reset-password?');

        return true;
    });
    Notification::assertNotSentTo($otherUser, ResetPassword::class);
});

it('cannot use one workspace reset token for another account with the same email', function () {
    $other = Tenant::create(['name' => 'Other', 'slug' => 'other-workspace', 'status' => 'active']);
    $user = workspaceDomainUser($this->tenant, ['email' => 'shared@example.test']);
    $otherUser = User::factory()->create(['tenant_id' => $other->id, 'email' => $user->email]);
    $token = Password::createToken($user);
    workspaceDomainColdRequest();

    $this->withHeader('X-Workspace', $other->slug)->postJson('/api/v1/auth/reset-password', [
        'email' => $user->email, 'token' => $token, 'password' => 'NewSecret123!', 'password_confirmation' => 'NewSecret123!',
    ])->assertUnprocessable();
    expect(Hash::check('NewSecret123!', $otherUser->refresh()->password))->toBeFalse();
});

it('keeps password reset tokens independent for two workspaces sharing an email', function () {
    $other = Tenant::create(['name' => 'Other', 'slug' => 'other-workspace', 'status' => 'active']);
    $user = workspaceDomainUser($this->tenant, ['email' => 'shared@example.test']);
    $otherUser = User::factory()->create(['tenant_id' => $other->id, 'email' => $user->email]);
    $token = Password::createToken($user);
    Password::createToken($otherUser);
    workspaceDomainColdRequest();
    $this->withHeader('X-Workspace', $this->tenant->slug)->postJson('/api/v1/auth/reset-password', [
        'email' => $user->email, 'token' => $token, 'password' => 'NewSecret123!', 'password_confirmation' => 'NewSecret123!',
    ])->assertOk();
});

it('refuses a two-factor challenge belonging to another workspace', function () {
    $other = Tenant::create(['name' => 'Other', 'slug' => 'other-workspace', 'status' => 'active']);
    $user = workspaceDomainUser($this->tenant, ['two_factor_secret' => 'JBSWY3DPEHPK3PXP', 'two_factor_confirmed_at' => now()]);
    $challenge = app(TwoFactorService::class)->issueChallenge($user, 'test');
    workspaceDomainColdRequest();

    $this->withHeader('X-Workspace', $other->slug)->postJson('/api/v1/auth/two-factor/challenge', [
        'challenge_token' => $challenge, 'code' => '123456',
    ])->assertForbidden();
});

it('exchanges a signup session once and only at its tenant workspace', function () {
    $other = Tenant::create(['name' => 'Other', 'slug' => 'other-workspace', 'status' => 'active']);
    $user = workspaceDomainUser($this->tenant, ['email_verified_at' => null]);
    $originToken = $user->createToken('signup')->plainTextToken;
    workspaceDomainColdRequest();
    $code = $this->withHeader('Authorization', 'Bearer '.$originToken)->postJson('/api/v1/auth/workspace-handoff')->assertOk()->json('data.code');
    workspaceDomainColdRequest();
    $this->withHeaders(['Authorization' => '', 'X-Workspace' => $other->slug])->postJson('/api/v1/auth/workspace-session', ['code' => $code])->assertForbidden();
    workspaceDomainColdRequest();
    $this->withHeader('X-Workspace', $this->tenant->slug)->postJson('/api/v1/auth/workspace-session', ['code' => $code])
        ->assertOk()->assertJsonPath('data.user.id', $user->id)->assertJsonPath('data.user.email_verified_at', null)->assertJsonStructure(['data' => ['token']]);
    workspaceDomainColdRequest();
    $this->postJson('/api/v1/auth/workspace-session', ['code' => $code])->assertUnprocessable();
});

it('expires the signup handoff after two minutes', function () {
    $user = workspaceDomainUser($this->tenant);
    $this->actingAs($user, 'api');
    $code = $this->postJson('/api/v1/auth/workspace-handoff')->assertOk()->json('data.code');
    workspaceDomainColdRequest();
    $this->travel(3)->minutes();
    $this->withHeader('X-Workspace', $this->tenant->slug)->postJson('/api/v1/auth/workspace-session', ['code' => $code])->assertUnprocessable();
});

it('does not exchange a handoff on the public site', function () {
    $this->postJson('/api/v1/auth/workspace-session', ['code' => str_repeat('a', 64)])->assertForbidden();
});

it('does not turn an expiring impersonation token into a regular session', function () {
    $user = workspaceDomainUser($this->tenant);
    $token = $user->createToken('impersonation:999', ['*'], now()->addHour())->plainTextToken;
    workspaceDomainColdRequest();
    $this->withHeader('Authorization', 'Bearer '.$token)->postJson('/api/v1/auth/workspace-handoff')->assertForbidden();
});

it('invalidates a pending handoff when the account password changes', function () {
    $user = workspaceDomainUser($this->tenant);
    $this->actingAs($user, 'api');
    $code = $this->postJson('/api/v1/auth/workspace-handoff')->assertOk()->json('data.code');
    $user->forceFill(['password' => 'New!Password123'])->save();
    workspaceDomainColdRequest();
    $this->withHeader('X-Workspace', $this->tenant->slug)->postJson('/api/v1/auth/workspace-session', ['code' => $code])->assertForbidden();
});

it('does not extend an explicitly expiring session through handoff', function () {
    $user = workspaceDomainUser($this->tenant);
    $token = $user->createToken('test', ['*'], now()->addSeconds(30))->plainTextToken;
    workspaceDomainColdRequest();
    $code = $this->withHeader('Authorization', 'Bearer '.$token)->postJson('/api/v1/auth/workspace-handoff')->assertOk()->json('data.code');
    $this->travel(45)->seconds();
    workspaceDomainColdRequest();
    $this->withHeaders(['Authorization' => '', 'X-Workspace' => $this->tenant->slug])->postJson('/api/v1/auth/workspace-session', ['code' => $code])->assertForbidden();
});

it('restricts integration credentials to the same workspace', function () {
    $other = Tenant::create(['name' => 'Other', 'slug' => 'other-workspace', 'status' => 'active']);
    $pair = createIntegrationCredential($this->tenant);
    workspaceDomainColdRequest();
    $this->withHeaders(['X-Api-Key' => $pair['key'], 'X-Api-Secret' => $pair['secret'], 'X-Workspace' => $other->slug])
        ->getJson('/api/v1/integration/tickets')->assertForbidden();
    workspaceDomainColdRequest();
    $this->withHeader('X-Workspace', $this->tenant->slug)->getJson('/api/v1/integration/tickets')->assertOk();
});

it('moves a newly registered owner into its workspace while preserving verification and permissions', function () {
    Notification::fake();
    $this->seed(MembershipPlanSeeder::class);
    workspaceDomainColdRequest();
    $registration = $this->postJson('/api/v1/tenants/register', [
        'tenant_name' => 'Crevol', 'tenant_slug' => 'crevol', 'owner_name' => 'Owner', 'owner_email' => 'owner@crevol.test',
        'owner_password' => 'Secret123!', 'owner_password_confirmation' => 'Secret123!',
    ])->assertCreated()->assertJsonPath('data.tenant.workspace_url', 'https://crevol.supporthub.com');
    workspaceDomainColdRequest();
    $code = $this->withHeader('Authorization', 'Bearer '.$registration->json('data.token'))->postJson('/api/v1/auth/workspace-handoff')->assertOk()->json('data.code');
    workspaceDomainColdRequest();
    $this->postJson('/api/v1/auth/logout')->assertOk();
    workspaceDomainColdRequest();
    $workspace = $this->withHeaders(['Authorization' => '', 'X-Workspace' => 'crevol'])
        ->postJson('/api/v1/auth/workspace-session', ['code' => $code])->assertOk()
        ->assertJsonPath('data.user.email_verified_at', null)->assertJsonPath('data.user.tenant.slug', 'crevol')
        ->assertJsonPath('data.user.roles.0', 'Administrator');
    workspaceDomainColdRequest();
    $this->withHeader('Authorization', 'Bearer '.$workspace->json('data.token'))->getJson('/api/v1/tickets')->assertForbidden();
    User::withoutTenantScope()->findOrFail($workspace->json('data.user.id'))->markEmailAsVerified();
    workspaceDomainColdRequest();
    $this->getJson('/api/v1/tickets')->assertOk();
});

it('reserves infrastructure subdomains and DNS-invalid signup IDs', function (string $slug) {
    $this->postJson('/api/v1/tenants/register', [
        'tenant_name' => 'Team', 'tenant_slug' => $slug, 'owner_name' => 'Owner', 'owner_email' => 'owner@example.test',
        'owner_password' => 'Secret123!', 'owner_password_confirmation' => 'Secret123!',
    ])->assertUnprocessable()->assertJsonValidationErrors('tenant_slug');
    $this->getJson('/api/v1/tenants/lookup/'.$slug)->assertOk()->assertJsonPath('data.available', false);
})->with(['api', 'www', 'under_score', '-team', 'team-', 'Uppercase']);

it('only resolves a single tenant label beneath the configured root domain', function () {
    expect(WorkspaceDomains::slugFromHost('crevol.supporthub.com'))->toBe('crevol')
        ->and(WorkspaceDomains::slugFromHost('crevol.supporthub.com.attacker.test'))->toBeNull()
        ->and(WorkspaceDomains::slugFromHost('nested.crevol.supporthub.com'))->toBeNull()
        ->and(WorkspaceDomains::slugFromHost('api.supporthub.com'))->toBeNull();
});

it('allows CORS only for valid workspace origins under the configured parent domain', function () {
    $repository = Env::getRepository();
    $previous = [];
    foreach (['WORKSPACE_DOMAIN' => 'supporthub.com', 'WORKSPACE_SCHEME' => 'https', 'WORKSPACE_PORT' => ''] as $key => $value) {
        $previous[$key] = $repository->get($key);
        $repository->set($key, $value);
    }
    try {
        $cors = require config_path('cors.php');
        $pattern = $cors['allowed_origins_patterns'][0];
        expect(preg_match($pattern, 'https://crevol.supporthub.com'))->toBe(1);
        foreach (['https://crevol.supporthub.com.attacker.test', 'https://a.crevol.supporthub.com', 'http://crevol.supporthub.com', 'https://crevol.supporthub.com:8443', 'https://under_score.supporthub.com'] as $origin) {
            expect(preg_match($pattern, $origin))->toBe(0);
        }
    } finally {
        foreach ($previous as $key => $value) {
            $value === null ? $repository->clear($key) : $repository->set($key, $value);
        }
    }
});
