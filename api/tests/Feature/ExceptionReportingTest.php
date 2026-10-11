<?php

use App\Exceptions\InvalidTicketStatusTransitionException;
use App\Exceptions\PlanLimitExceededException;
use App\Exceptions\WebhookDeliveryFailedException;
use Illuminate\Support\Facades\Log;

it('does not report expected business outcomes as errors', function () {
    foreach ([
        new PlanLimitExceededException('tickets_per_month', 200),
        InvalidTicketStatusTransitionException::make('closed', 'open'),
        new WebhookDeliveryFailedException('endpoint returned 500'),
    ] as $expected) {
        Log::spy();

        report($expected);

        Log::shouldNotHaveReceived('error');
    }
});

it('still reports a genuine failure', function () {
    Log::spy();

    report(new RuntimeException('database exploded'));

    Log::shouldHaveReceived('error')->once();
});

it('keeps answering those business outcomes with a clean JSON message', function () {
    $admin = actingAsAdministrator();
    $ticket = \App\Models\Ticket::factory()->create();   // an open ticket cannot be "reopened"

    Log::spy();
    $this->actingAs($admin, 'api')->postJson("/api/v1/tickets/{$ticket->id}/reopen")
        ->assertStatus(422)
        ->assertJsonPath('success', false);
    Log::shouldNotHaveReceived('error');
});
