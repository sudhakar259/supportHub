<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Process;
use Symfony\Component\Process\PhpExecutableFinder;

/**
 * Ticket-number generation must be safe when many requests race to
 * create the first ticket of a period at the same instant. A single
 * PHPUnit process can't reproduce that — everything runs on one
 * connection — so this spins up real, separate OS processes (each
 * opening its own DB connection against a shared on-disk SQLite file)
 * and has them all call GenerateTicketNumberAction at once via the
 * `tickets:generate-number` command.
 */
it('never generates a duplicate ticket number under concurrent requests', function () {
    $dbPath = sys_get_temp_dir().'/supporthub_concurrency_'.uniqid().'.sqlite';
    touch($dbPath);

    config(['database.connections.concurrency_test' => [
        'driver' => 'sqlite',
        'database' => $dbPath,
        'prefix' => '',
        'foreign_key_constraints' => true,
    ]]);

    Artisan::call('migrate', ['--database' => 'concurrency_test', '--force' => true]);

    // WAL mode lets writers queue (respecting busy_timeout) instead of
    // the rollback-journal default, where a second writer against the
    // same file fails immediately with "database is locked" rather than
    // waiting — a SQLite-only quirk that would otherwise sink this test
    // for reasons unrelated to the actual locking logic being tested.
    DB::connection('concurrency_test')->statement('PRAGMA journal_mode=WAL');

    DB::connection('concurrency_test')->table('ticket_number_settings')->insert([
        'department_id' => null,
        'prefix' => 'TKT',
        'format' => '{prefix}-{year}-{number}',
        'starting_number' => 1,
        'number_length' => 6,
        'reset_period' => 'yearly',
        'is_active' => true,
        'effective_from' => now(),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $concurrency = 15;
    $phpBinary = (new PhpExecutableFinder)->find() ?: 'php';

    $pool = Process::pool(function ($pool) use ($concurrency, $dbPath, $phpBinary) {
        for ($i = 0; $i < $concurrency; $i++) {
            $pool->path(base_path())
                ->env([
                    'DB_CONNECTION' => 'sqlite',
                    'DB_DATABASE' => $dbPath,
                ])
                ->command([$phpBinary, 'artisan', 'tickets:generate-number']);
        }
    })->start();

    $results = $pool->wait();

    $numbers = [];
    foreach ($results as $result) {
        expect($result->successful())->toBeTrue(
            "Process failed (exit {$result->exitCode()}): stdout=[{$result->output()}] stderr=[{$result->errorOutput()}]"
        );
        $numbers[] = trim($result->output());
    }

    @unlink($dbPath);

    expect($numbers)->toHaveCount($concurrency);
    expect(array_unique($numbers))->toHaveCount($concurrency);

    sort($numbers);
    expect($numbers[0])->toBe('TKT-'.now()->format('Y').'-000001');
    expect(end($numbers))->toBe('TKT-'.now()->format('Y').'-'.str_pad((string) $concurrency, 6, '0', STR_PAD_LEFT));
});
