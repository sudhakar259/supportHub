<?php

use App\Models\User;
use Illuminate\Support\Facades\Artisan;

/** Runs the command and returns [exit code, ['Check name' => 'PASS'|'WARN'|'FAIL']]. */
function preflight(array $options = []): array
{
    $code = Artisan::call('deskzeal:preflight', $options);
    $statuses = [];

    foreach (explode("\n", Artisan::output()) as $line) {
        if (preg_match('/^\|\s*(PASS|WARN|FAIL)\s*\|\s*(.+?)\s*\|/', $line, $m)) {
            $statuses[$m[2]] = $m[1];
        }
    }

    return [$code, $statuses];
}

/** A configuration that satisfies every check that can fail outside production. */
function healthyConfig(): void
{
    config([
        'app.debug' => false,
        'cache.default' => 'file',
        'mail.default' => 'smtp',
        'mail.mailers.smtp.host' => 'smtp.mailgun.org',
        'mail.from.address' => 'support@help.io',
        'queue.default' => 'redis',
        'app.url' => 'https://api.help.io',
        'app.frontend_url' => 'https://app.help.io',
        'cors.allowed_origins' => ['https://app.help.io'],
        'filesystems.default' => 's3',
        'services.razorpay.key_id' => 'rzp_live_x',
        'services.razorpay.key_secret' => 'secret',
        'services.razorpay.webhook_secret' => 'whsec',
        'inbound_email.domain' => null,
        'proxies.trusted' => '10.0.0.0/8',
        'sanctum.expiration' => 43200,
    ]);
}

it('always fails when debug mode is on, even outside production', function () {
    healthyConfig();
    config(['app.debug' => true]);

    [$code, $r] = preflight();

    expect($code)->toBe(1)->and($r['APP_DEBUG is off'])->toBe('FAIL');
});

it('treats production-only settings as warnings locally and as failures in production', function () {
    healthyConfig();
    config(['queue.default' => 'sync', 'app.url' => 'http://localhost:8000']);

    [$localCode, $local] = preflight();
    expect($local['Queue runs in the background'])->toBe('WARN')
        ->and($local['APP_URL is a public https address'])->toBe('WARN')
        ->and($localCode)->toBe(0);

    [$strictCode, $strict] = preflight(['--production' => true]);
    expect($strict['Queue runs in the background'])->toBe('FAIL')
        ->and($strict['APP_URL is a public https address'])->toBe('FAIL')
        ->and($strictCode)->toBe(1);
});

it('passes a healthy configuration', function () {
    healthyConfig();

    [, $r] = preflight(['--production' => true]);

    foreach (['APP_DEBUG is off', 'Queue runs in the background', 'Email is actually sent', 'Email uses a transactional provider', 'MAIL_FROM_ADDRESS is on your own domain', 'FRONTEND_URL is a public https address', 'CORS allows only your real web address', 'Razorpay keys are set', 'Attachments are on durable storage'] as $check) {
        expect($r[$check])->toBe('PASS', $check);
    }
});

it('fails when mail is only written to a log, or sent through Gmail', function () {
    healthyConfig();
    config(['mail.default' => 'log']);
    expect(preflight()[1]['Email is actually sent'])->toBe('FAIL');

    healthyConfig();
    config(['mail.mailers.smtp.host' => 'smtp.gmail.com', 'mail.from.address' => 'someone@gmail.com']);
    [, $r] = preflight();
    expect($r['Email uses a transactional provider'])->toBe('WARN')->and($r['MAIL_FROM_ADDRESS is on your own domain'])->toBe('WARN');
});

it('fails when inbound email is on but the Mailgun signing key is missing', function () {
    healthyConfig();
    config(['inbound_email.domain' => 'inbound.help.io', 'inbound_email.mailgun_signing_key' => null]);
    expect(preflight()[1]['Inbound email has its Mailgun signing key'])->toBe('FAIL');

    config(['inbound_email.mailgun_signing_key' => 'key']);
    expect(preflight()[1]['Inbound email has its Mailgun signing key'])->toBe('PASS');
});

it('fails when payments are configured without a webhook secret', function () {
    healthyConfig();
    config(['services.razorpay.webhook_secret' => null]);

    expect(preflight()[1]['Razorpay webhook secret is set'])->toBe('FAIL');
});

it('flags seeded demo accounts', function () {
    healthyConfig();
    testTenant();
    User::factory()->create(['email' => 'admin@deskzeal.test', 'tenant_id' => testTenant()->id]);

    [, $r] = preflight();
    expect($r['No demo accounts'])->toBe('WARN');
    [, $strict] = preflight(['--production' => true]);
    expect($strict['No demo accounts'])->toBe('FAIL');
});

it('refuses a CORS wildcard or localhost origin in production', function () {
    healthyConfig();
    config(['cors.allowed_origins' => ['*']]);

    expect(preflight(['--production' => true])[1]['CORS allows only your real web address'])->toBe('FAIL');
});

it('exits cleanly outside production when only warnings remain', function () {
    healthyConfig();
    config(['queue.default' => 'sync']);

    [$code] = preflight();
    expect($code)->toBe(0);
});

it('flags missing trusted proxies and sign-ins that never expire', function () {
    healthyConfig();
    config(['proxies.trusted' => '', 'sanctum.expiration' => null]);

    [, $local] = preflight();
    [, $strict] = preflight(['--production' => true]);

    expect($local['Visitor IPs are read from the load balancer'])->toBe('WARN')
        ->and($local['Sign-ins expire'])->toBe('WARN')
        ->and($strict['Visitor IPs are read from the load balancer'])->toBe('FAIL')
        ->and($strict['Sign-ins expire'])->toBe('FAIL');

    healthyConfig();
    [, $ok] = preflight(['--production' => true]);
    expect($ok['Visitor IPs are read from the load balancer'])->toBe('PASS')->and($ok['Sign-ins expire'])->toBe('PASS');
});

it('keeps the previous preflight command name available', function () {
    healthyConfig();
    expect(Artisan::call('supporthub:preflight'))->toBe(0);
});

it('continues detecting legacy demo accounts after the rebrand', function () {
    healthyConfig();
    User::factory()->create(['email' => 'admin@supporthub.test', 'tenant_id' => testTenant()->id]);
    expect(preflight(['--production' => true])[1]['No demo accounts'])->toBe('FAIL');
});

it('still prints the whole report when the database cannot be reached, instead of crashing', function () {
    healthyConfig();
    $original = config('database.default');
    config([
        'database.default' => 'unreachable',
        'database.connections.unreachable' => ['driver' => 'sqlite', 'database' => '/nonexistent/path/db.sqlite', 'prefix' => '', 'foreign_key_constraints' => false],
    ]);
    app('db')->purge('unreachable');

    try {
        [$code, $r] = preflight();
    } finally {
        // The test runner's own clean-up uses the default connection, so put the real one back first.
        config(['database.default' => $original]);
        app('db')->purge('unreachable');
    }

    expect($code)->toBe(1)
        ->and($r['Database is reachable'])->toBe('FAIL')
        ->and($r['Migrations are up to date'])->toBe('FAIL')
        // …and the checks that do not need the database still ran.
        ->and($r['APP_DEBUG is off'])->toBe('PASS')
        ->and($r['Queue runs in the background'])->toBe('PASS')
        ->and($r)->toHaveKey('Errors are reported to a tracking service');
});

it('only warns, never fails, when error tracking is not set up, even in production mode', function () {
    healthyConfig();
    config(['sentry.dsn' => null]);

    [, $local] = preflight();
    [, $strict] = preflight(['--production' => true]);

    expect($local['Errors are reported to a tracking service'])->toBe('WARN')
        ->and($strict['Errors are reported to a tracking service'])->toBe('WARN');

    config(['sentry.dsn' => 'https://abc123@o1.ingest.sentry.io/1']);
    expect(preflight()[1]['Errors are reported to a tracking service'])->toBe('PASS');
});
