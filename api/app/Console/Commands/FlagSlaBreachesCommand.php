<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * QA fix for a real gap (2026-10-01): first_response_breached and
 * resolution_breached were previously only ever written reactively — the
 * moment an agent actually replied, or the moment a ticket was actually
 * resolved (see CreateTicketMessageAction / UpdateTicketStatusAction).
 * A ticket that simply sat overdue with nobody touching it never showed
 * up as breached in GET /tickets?filter[sla_status]=breached nor in
 * GET /reports/sla-compliance until someone acted on it. This command
 * closes that gap by proactively scanning for tickets whose due date has
 * already passed. It is scheduled to run every 5 minutes (routes/console.php).
 */
class FlagSlaBreachesCommand extends Command
{
    protected $signature = 'tickets:flag-sla-breaches';

    protected $description = 'Proactively mark overdue-but-untouched ticket SLAs as breached.';

    public function handle(): int
    {
        $now = now();

        $firstResponse = DB::table('ticket_slas')
            ->whereNull('first_response_met_at')
            ->where('first_response_breached', false)
            ->where('first_response_due_at', '<', $now)
            ->update(['first_response_breached' => true]);

        // Resolution breach only applies to a ticket that hasn't been
        // resolved yet — once resolved_met_at is set, UpdateTicketStatusAction
        // already made the authoritative met/breached determination at the
        // moment of resolution and this command must not override it.
        $resolution = DB::table('ticket_slas')
            ->whereNull('resolved_met_at')
            ->where('resolution_breached', false)
            ->where('resolution_due_at', '<', $now)
            ->update(['resolution_breached' => true, 'status' => 'breached']);

        $this->info("Flagged {$firstResponse} overdue first-response SLA(s) and {$resolution} overdue resolution SLA(s) as breached.");

        return self::SUCCESS;
    }
}
