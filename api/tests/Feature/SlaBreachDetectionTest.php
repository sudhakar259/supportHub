<?php

use App\Models\SlaPolicy;
use App\Models\Ticket;
use App\Models\TicketSla;

beforeEach(function () {
    testTenant();
});

// QA regression (2026-10-01): breach flags were previously only ever set
// reactively (on first reply / on resolution) — an overdue ticket nobody
// had touched yet stayed invisible to both the sla_status filter and the
// SLA compliance report. tickets:flag-sla-breaches (scheduled every 5
// minutes) closes that gap.
it('proactively flags an overdue, untouched ticket as breached', function () {
    $ticket = Ticket::factory()->create();

    $sla = TicketSla::create([
        'ticket_id' => $ticket->id,
        'sla_policy_id' => SlaPolicy::factory()->create()->id,
        'started_at' => now()->subHours(3),
        'first_response_due_at' => now()->subHour(),
        'resolution_due_at' => now()->subMinutes(30),
        'status' => 'pending',
        'first_response_breached' => false,
        'resolution_breached' => false,
    ]);

    $this->artisan('tickets:flag-sla-breaches')->assertExitCode(0);

    $sla->refresh();
    expect($sla->first_response_breached)->toBeTrue();
    expect($sla->resolution_breached)->toBeTrue();
    expect($sla->status)->toBe('breached');
});

it('does not override an already-resolved ticket\'s met/breached determination', function () {
    $ticket = Ticket::factory()->create();

    $sla = TicketSla::create([
        'ticket_id' => $ticket->id,
        'sla_policy_id' => SlaPolicy::factory()->create()->id,
        'started_at' => now()->subHours(3),
        'first_response_due_at' => now()->subHours(2),
        'resolution_due_at' => now()->subHour(),
        'first_response_met_at' => now()->subHours(2)->addMinutes(5),
        'resolved_met_at' => now()->subMinutes(45), // resolved BEFORE the due date — correctly "met"
        'status' => 'met',
        'first_response_breached' => false,
        'resolution_breached' => false,
    ]);

    $this->artisan('tickets:flag-sla-breaches')->assertExitCode(0);

    $sla->refresh();
    expect($sla->resolution_breached)->toBeFalse();
    expect($sla->status)->toBe('met');
});

it('does not touch a ticket that is not yet overdue', function () {
    $ticket = Ticket::factory()->create();

    $sla = TicketSla::create([
        'ticket_id' => $ticket->id,
        'sla_policy_id' => SlaPolicy::factory()->create()->id,
        'started_at' => now(),
        'first_response_due_at' => now()->addHour(),
        'resolution_due_at' => now()->addHours(4),
        'status' => 'pending',
        'first_response_breached' => false,
        'resolution_breached' => false,
    ]);

    $this->artisan('tickets:flag-sla-breaches')->assertExitCode(0);

    $sla->refresh();
    expect($sla->first_response_breached)->toBeFalse();
    expect($sla->resolution_breached)->toBeFalse();
    expect($sla->status)->toBe('pending');
});
