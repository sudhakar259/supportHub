<?php

use App\Models\Department;
use App\Models\Ticket;

beforeEach(function () {
    testTenant();
});

// QA regression (2026-10-01): ticketSummary() previously grouped by
// ticket_statuses.name / ticket_priorities.name while ordering by a
// sibling, non-aggregated column (sort_order / level) — rejected outright
// by MySQL's default ONLY_FULL_GROUP_BY sql_mode with a 500. SQLite (used
// here) doesn't enforce that mode, so this endpoint had zero test coverage
// and the bug shipped undetected through the rest of the suite. This test
// exists so a future regression at least fails loudly in CI even though it
// can't reproduce the MySQL-specific SQL error itself.
it('returns the ticket volume summary report without error, reconciling totals across an unrouted ticket', function () {
    $admin = actingAsAdministrator();
    $department = Department::factory()->create();

    Ticket::factory()->count(2)->create(['department_id' => $department->id]);
    Ticket::factory()->create(['department_id' => null]); // unrouted — must not be silently dropped

    $response = $this->actingAs($admin, 'api')
        ->getJson('/api/v1/reports/tickets-summary')
        ->assertOk();

    expect($response->json('data.total_tickets'))->toBe(3);

    $byDepartment = collect($response->json('data.by_department'));
    expect($byDepartment->sum('count'))->toBe(3);
    expect($byDepartment->firstWhere('department', 'Unrouted')['count'])->toBe(1);
    expect($byDepartment->firstWhere('department', $department->name)['count'])->toBe(2);

    $byStatus = collect($response->json('data.by_status'));
    expect($byStatus->sum('count'))->toBe(3);

    $byPriority = collect($response->json('data.by_priority'));
    expect($byPriority->sum('count'))->toBe(3);
});

it('denies the ticket volume summary report to a role without reports.view', function () {
    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')
        ->getJson('/api/v1/reports/tickets-summary')
        ->assertStatus(403);
});
