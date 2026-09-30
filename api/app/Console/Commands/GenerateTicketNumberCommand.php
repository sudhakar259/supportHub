<?php

namespace App\Console\Commands;

use App\Actions\Ticket\GenerateTicketNumberAction;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Exists purely so the ticket-number concurrency test can spawn real,
 * separate OS processes (each with its own DB connection) racing
 * against the same sequence row — something a single PHPUnit process
 * cannot exercise on its own.
 */
class GenerateTicketNumberCommand extends Command
{
    protected $signature = 'tickets:generate-number {--department=}';

    protected $description = 'Generate a single ticket number and print it (used by the concurrency test harness).';

    public function handle(GenerateTicketNumberAction $action): int
    {
        // SQLite only allows one writer at a time and, unlike MySQL's
        // InnoDB row locks, fails fast with "database is locked" instead
        // of blocking. This PRAGMA makes it block-and-retry like the
        // production MySQL target does, which is what this command's
        // only caller — the concurrency test — needs to actually
        // exercise contention instead of just erroring on it.
        if (DB::connection()->getDriverName() === 'sqlite') {
            DB::statement('PRAGMA busy_timeout = 10000');
        }

        $departmentId = $this->option('department') ? (int) $this->option('department') : null;

        $this->line($action->execute($departmentId));

        return self::SUCCESS;
    }
}
