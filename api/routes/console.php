<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Proactively catches SLA breaches on tickets nobody has acted on yet —
// see FlagSlaBreachesCommand for why this is needed. Runs under the
// `scheduler` container (docker-compose.yml), which loops
// `php artisan schedule:run` every 60s.
Schedule::command('tickets:flag-sla-breaches')->everyFiveMinutes();

Schedule::command('billing:issue-renewals')->hourly();
Schedule::command('billing:enforce-lapses')->hourly();

// Idempotency keys are only replayable for 24 hours (see IdempotentRequest).
Schedule::call(fn () => DB::table('idempotency_keys')->where('created_at', '<', now()->subDay())->delete())
    ->daily()
    ->name('prune-idempotency-keys');
