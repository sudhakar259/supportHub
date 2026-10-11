<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Checks the live configuration against what a production deployment needs, so the
 * unsafe settings are found before launch instead of after. Run it on the server (or in
 * the image) with the production environment loaded:
 *
 *     php artisan supporthub:preflight               # fails (exit 1) only in production
 *     php artisan supporthub:preflight --production  # judge as if this were production
 */
class PreflightCommand extends Command
{
    protected $signature = 'supporthub:preflight {--production : Treat every production-only warning as a failure}';

    protected $description = 'Check the configuration for production readiness';

    /** @var array<int, array{0: string, 1: string, 2: string}> status, check, detail */
    private array $results = [];

    private bool $strict = false;

    public function handle(): int
    {
        $this->strict = $this->option('production') || app()->environment('production');

        $this->checkApp();
        $this->checkDatabase();
        $this->checkQueueAndCache();
        $this->checkMail();
        $this->checkIntegrations();
        $this->checkData();

        $this->table(['', 'Check', 'Detail'], array_map(fn (array $r) => [
            ['PASS' => '<info>PASS</info>', 'WARN' => '<comment>WARN</comment>', 'FAIL' => '<error>FAIL</error>'][$r[0]], $r[1], $r[2],
        ], $this->results));

        $failed = count(array_filter($this->results, fn (array $r) => $r[0] === 'FAIL'));
        $warned = count(array_filter($this->results, fn (array $r) => $r[0] === 'WARN'));

        if ($failed > 0) {
            $this->error("{$failed} check(s) failed".($warned ? ", {$warned} warning(s)." : '.').' Fix these before going live.');

            return self::FAILURE;
        }

        $this->{$warned ? 'warn' : 'info'}($warned
            ? "{$warned} warning(s). ".($this->strict ? '' : 'They would be failures in production (use --production to see).')
            : 'All checks passed.');

        return self::SUCCESS;
    }

    private function checkApp(): void
    {
        $this->expect(filled(config('app.key')), 'APP_KEY is set', 'Run `php artisan key:generate --show` and set it as a secret.', always: true);
        $this->expect(app()->environment('production'), 'APP_ENV is production', 'Currently "'.app()->environment().'".');
        $this->expect(config('app.debug') === false, 'APP_DEBUG is off', 'Debug mode shows stack traces and settings to anyone who triggers an error.', always: true);
        $this->expect(config('logging.channels.'.config('logging.default').'.level', 'debug') !== 'debug' || ! $this->strict, 'LOG_LEVEL is not debug', 'Debug logs are noisy and can contain personal data.');

        foreach (['app.url' => 'APP_URL', 'app.frontend_url' => 'FRONTEND_URL'] as $key => $name) {
            $url = (string) config($key);
            $ok = str_starts_with($url, 'https://') && ! preg_match('/localhost|127\.0\.0\.1|\.test\b|\.local\b/', $url);
            $this->expect($ok, "{$name} is a public https address", $url === '' ? 'Not set.' : "Currently {$url}.");
        }

        $this->expect(trim((string) config('proxies.trusted')) !== '', 'Visitor IPs are read from the load balancer', 'TRUSTED_PROXIES is empty, so every visitor would appear to come from the balancer: they would share one sign-in rate limit and the audit log would record the wrong address.');
        $this->expect(config('sanctum.expiration') !== null, 'Sign-ins expire', 'SANCTUM_TOKEN_EXPIRATION_MINUTES is empty, so a stolen token would work forever. Set it, for example 43200 (30 days).');

        $origins = (array) config('cors.allowed_origins');
        $bad = array_filter($origins, fn ($o) => $o === '*' || preg_match('/localhost|127\.0\.0\.1/', (string) $o));
        $this->expect($bad === [], 'CORS allows only your real web address', $bad ? 'Allows: '.implode(', ', $bad).'.' : '');
    }

    private function checkDatabase(): void
    {
        $this->expect(config('database.default') !== 'sqlite', 'Database is not SQLite', 'Use MySQL/MariaDB or PostgreSQL in production.');

        try {
            DB::select('select 1');
            $this->result('PASS', 'Database is reachable', config('database.default'));
        } catch (\Throwable $e) {
            $this->result('FAIL', 'Database is reachable', $e->getMessage());

            return;
        }

        $migrator = app('migrator');
        $files = array_keys($migrator->getMigrationFiles(array_merge($migrator->paths(), [database_path('migrations')])));
        $ran = Schema::hasTable(config('database.migrations.table', 'migrations')) ? $migrator->getRepository()->getRan() : [];
        $pending = count(array_diff($files, $ran));
        $this->expect($pending === 0, 'Migrations are up to date', $pending.' pending. Run `php artisan migrate --force`.', always: true);
    }

    private function checkQueueAndCache(): void
    {
        $this->expect(config('queue.default') !== 'sync', 'Queue runs in the background', 'QUEUE_CONNECTION=sync sends email and webhooks during the request. Use redis or database with a worker.');
        $this->expect(! in_array(config('cache.default'), ['array'], true), 'Cache is shared and persistent', 'CACHE_STORE=array forgets everything between requests (breaks rate limits and 2FA sign-in).', always: true);
        $this->expect(config('filesystems.default') !== 'local' || ! $this->strict, 'Attachments are on durable storage', 'FILESYSTEM_DISK=local keeps files on the server disk; they are lost when a container is replaced. Use S3, or mount a persistent volume and ignore this warning.');
    }

    private function checkMail(): void
    {
        $mailer = (string) config('mail.default');
        $this->expect(! in_array($mailer, ['log', 'array'], true), 'Email is actually sent', "MAIL_MAILER={$mailer} writes mail to a log instead of sending it.", always: true);

        $host = (string) config('mail.mailers.smtp.host');
        $this->expect(! ($mailer === 'smtp' && preg_match('/gmail\.com|googlemail\.com/', $host)), 'Email uses a transactional provider', 'Gmail SMTP is for testing: strict daily limits, and mail to other providers often lands in spam. Use Postmark, Mailgun, SES or similar with SPF/DKIM on your own domain.');

        $from = (string) config('mail.from.address');
        $this->expect($from !== '' && ! preg_match('/@(example\.|.*\.test$|.*localhost|gmail\.com)/i', $from), 'MAIL_FROM_ADDRESS is on your own domain', "Currently {$from}.");
    }

    private function checkIntegrations(): void
    {
        $paymentsConfigured = filled(config('services.razorpay.key_id')) && filled(config('services.razorpay.key_secret'));
        $this->expect($paymentsConfigured, 'Razorpay keys are set', 'Paid plans cannot be charged without them.');
        $this->expect(! $paymentsConfigured || filled(config('services.razorpay.webhook_secret')), 'Razorpay webhook secret is set', 'Without it payment confirmations from Razorpay are rejected.', always: true);

        $inbound = filled(config('inbound_email.domain'));
        $this->expect(! $inbound || filled(config('inbound_email.mailgun_signing_key')), 'Inbound email has its Mailgun signing key', 'INBOUND_EMAIL_DOMAIN is set but MAILGUN_SIGNING_KEY is not, so every forwarded email is refused.', always: true);
    }

    private function checkData(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        $demo = User::withoutGlobalScopes()->where(fn ($q) => $q->where('email', 'like', '%@supporthub.test')->orWhere('email', 'like', '%@%-helpdesk.test'))->count();
        $this->expect($demo === 0, 'No demo accounts', "{$demo} seeded demo account(s) exist (…@supporthub.test). They have well-known passwords: delete them or run on a fresh database without the demo seeders.");
    }

    /** Records PASS, or FAIL/WARN depending on how strict this run is. */
    private function expect(bool $ok, string $check, string $detail = '', bool $always = false): void
    {
        $this->result($ok ? 'PASS' : ($always || $this->strict ? 'FAIL' : 'WARN'), $check, $ok ? '' : $detail);
    }

    private function result(string $status, string $check, string $detail): void
    {
        $this->results[] = [$status, $check, $detail];
    }
}
