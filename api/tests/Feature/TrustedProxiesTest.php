<?php

use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/** Calls a throw-away route and reports what the app believes about the visitor. */
function seenBy($test, string $remoteAddr, array $headers): array
{
    Route::get('/_test/visitor', fn (Request $r) => ['ip' => $r->ip(), 'secure' => $r->isSecure()]);

    return $test->withServerVariables(['REMOTE_ADDR' => $remoteAddr])->withHeaders($headers)->getJson('/_test/visitor')->assertOk()->json();
}

function trust(string $list): void
{
    config(['proxies.trusted' => $list]);
    $list = trim($list);
    TrustProxies::at($list === '*' ? '*' : array_values(array_filter(array_map('trim', explode(',', $list)))));
}

afterEach(fn () => TrustProxies::flushState());

it('uses the visitor\'s address and HTTPS from a trusted load balancer', function () {
    trust('10.0.0.0/8');

    $seen = seenBy($this, '10.0.3.7', ['X-Forwarded-For' => '203.0.113.50', 'X-Forwarded-Proto' => 'https']);

    expect($seen)->toBe(['ip' => '203.0.113.50', 'secure' => true]);
});

it('reads the address through a balancer and a container hop (Docker network)', function () {
    trust('10.0.0.0/8,172.16.0.0/12');

    // client -> ALB (10.x) -> nginx container (172.x) -> php-fpm
    $seen = seenBy($this, '172.18.0.5', ['X-Forwarded-For' => '203.0.113.50, 10.0.1.9', 'X-Forwarded-Proto' => 'https']);

    expect($seen['ip'])->toBe('203.0.113.50');
});

it('does not believe forwarded headers from an address that is not a trusted proxy', function () {
    trust('10.0.0.0/8');

    // Someone reaching the API directly and claiming to be another IP / on HTTPS.
    $seen = seenBy($this, '198.51.100.9', ['X-Forwarded-For' => '1.2.3.4', 'X-Forwarded-Proto' => 'https']);

    expect($seen)->toBe(['ip' => '198.51.100.9', 'secure' => false]);
});

it('trusts any sender when set to *', function () {
    trust('*');

    expect(seenBy($this, '198.51.100.9', ['X-Forwarded-For' => '203.0.113.50'])['ip'])->toBe('203.0.113.50');
});

it('gives each visitor behind the balancer their own sign-in rate limit', function () {
    trust('10.0.0.0/8');
    $from = fn (string $ip) => $this->withServerVariables(['REMOTE_ADDR' => '10.0.0.5'])->withHeaders(['X-Forwarded-For' => $ip])
        ->postJson('/api/v1/auth/login', ['email' => 'nobody@example.test', 'password' => 'x']);

    foreach (range(1, 10) as $_) {
        $from('203.0.113.1')->assertStatus(422);
    }
    $from('203.0.113.1')->assertStatus(429);    // this visitor used up their allowance…
    $from('203.0.113.2')->assertStatus(422);    // …another visitor behind the same balancer did not
});
