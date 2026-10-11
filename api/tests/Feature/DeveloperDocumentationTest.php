<?php

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Auth;

it('requires sign-in for documentation and both reference downloads', function (string $path) {
    $this->getJson('/api/v1/developer-docs'.$path)->assertUnauthorized();
})->with(['', '/openapi', '/postman']);

it('allows signed-in tenant users to read documentation without granting integration management', function (string $role) {
    $user = match ($role) {
        'admin' => actingAsAdministrator(),
        'agent' => actingAsAgent(),
        'customer' => actingAsCustomer(),
    };

    $response = $this->actingAs($user, 'api')->getJson('/api/v1/developer-docs')
        ->assertOk()
        ->assertJsonStructure(['data' => ['guide', 'reference', 'baseUrl']])
        ->assertHeader('X-Robots-Tag', 'noindex, nofollow');

    expect($response->json('data.guide'))->toContain('X-Api-Key', 'X-Api-Secret', 'X-Webhook-Signature')
        ->and($response->json('data.reference'))->not->toBeEmpty()
        ->and($response->headers->get('Cache-Control'))->toContain('private', 'no-store');
})->with(['admin', 'agent', 'customer']);

it('serves authenticated OpenAPI and Postman exports without public caching', function (string $format, string $file) {
    $user = actingAsAdministrator();
    $response = $this->actingAs($user, 'api')->get('/api/v1/developer-docs/'.$format)
        ->assertOk()
        ->assertDownload($file)
        ->assertHeader('X-Robots-Tag', 'noindex, nofollow');

    expect($response->headers->get('Cache-Control'))->toContain('private', 'no-store');
})->with([['openapi', 'openapi.yaml'], ['postman', 'collection.json']]);

it('rejects revoked and expired session tokens', function (string $status) {
    $user = actingAsAdministrator();
    $token = $user->createToken('Documentation test', ['*'], $status === 'expired' ? now()->subMinute() : now()->addHour());
    if ($status === 'revoked') {
        $token->accessToken->delete();
    }

    $this->withToken($token->plainTextToken)->getJson('/api/v1/developer-docs')->assertUnauthorized();
})->with(['revoked', 'expired']);

it('blocks an inactive account and an inactive tenant', function (string $status) {
    $user = actingAsAdministrator();
    if ($status === 'user') {
        $user->update(['is_active' => false]);
    } else {
        $user->tenant->update(['status' => 'suspended']);
    }

    $this->actingAs($user, 'api')->getJson('/api/v1/developer-docs')->assertStatus($status === 'user' ? 401 : 403);
})->with(['user', 'tenant']);

it('does not accept integration credentials as a signed-in documentation session', function () {
    $user = actingAsAdministrator();
    $created = $this->actingAs($user, 'api')->postJson('/api/v1/api-credentials', [
        'name' => 'Backend', 'scopes' => ['tickets.read'],
    ])->assertCreated();

    Auth::forgetGuards();
    $this->withHeaders(['X-Api-Key' => $created->json('data.key'), 'X-Api-Secret' => $created->json('data.secret')])
        ->getJson('/api/v1/developer-docs')->assertUnauthorized();
});

it('rejects a session presented through a different workspace', function () {
    $user = actingAsAdministrator();
    $other = Tenant::create(['name' => 'Other', 'slug' => 'other-workspace', 'status' => 'active']);
    $token = $user->createToken('Documentation test')->plainTextToken;
    app(TenantContext::class)->clear();
    Auth::forgetGuards();

    $this->withHeaders(['Authorization' => 'Bearer '.$token, 'X-Workspace' => $other->slug])
        ->getJson('/api/v1/developer-docs')->assertForbidden();
});

it('retires every former public documentation address', function (string $path) {
    $this->get($path)->assertNotFound();
})->with(['/docs', '/docs/', '/docs/index.html', '/docs/openapi.yaml', '/docs/collection.json', '/docs/css/theme-default.style.css', '/docs/js/theme-default-5.11.0.js', '/docs.openapi', '/docs.postman']);

it('keeps generated documentation outside the public web directory', function () {
    expect(is_dir(public_path('docs')))->toBeFalse()
        ->and(config('scribe.static.output_path'))->toBe('resources/developer-docs/reference')
        ->and(is_file(resource_path('developer-docs/reference/index.html')))->toBeTrue();
});

it('does not allow arbitrary private files to be downloaded', function () {
    $user = actingAsAdministrator();
    $this->actingAs($user, 'api')->get('/api/v1/developer-docs/index.html')->assertNotFound();
    $this->get('/api/v1/developer-docs/integration-guide.md')->assertNotFound();
});
