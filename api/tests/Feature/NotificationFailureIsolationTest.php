<?php

use App\Enums\NotificationLogStatus;
use App\Models\Customer;
use App\Models\NotificationLog;
use App\Models\Ticket;
use Database\Seeders\NotificationTemplateSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    testTenant();
    $this->seed([NotificationTemplateSeeder::class]);
});

it('still creates the ticket when the notification transport fails', function () {
    $customer = Customer::factory()->create();

    Notification::shouldReceive('send')->andThrow(new RuntimeException('SMTP unavailable'));

    $this->actingAs($customer->user, 'api')
        ->postJson('/api/v1/tickets', [
            'subject' => 'Cannot access my account',
            'description' => 'Getting a 500 error.',
        ])->assertCreated();

    expect(Ticket::count())->toBe(1);
    expect(NotificationLog::where('event_key', 'ticket_created')->value('status'))
        ->toBe(NotificationLogStatus::Failed);
});
