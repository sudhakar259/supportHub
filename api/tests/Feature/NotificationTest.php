<?php

use App\Models\Customer;
use App\Models\NotificationLog;
use App\Models\NotificationPreference;
use App\Models\Ticket;
use App\Notifications\TicketEventNotification;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->seed([
        \Database\Seeders\RolesAndPermissionsSeeder::class,
        \Database\Seeders\TicketStatusSeeder::class,
        \Database\Seeders\TicketPrioritySeeder::class,
        \Database\Seeders\TicketNumberSettingSeeder::class,
        \Database\Seeders\NotificationTemplateSeeder::class,
    ]);
});

it('sends a rendered ticket_created notification to the customer and logs it', function () {
    Notification::fake();

    $customer = Customer::factory()->create();

    $this->actingAs($customer->user, 'api')
        ->postJson('/api/v1/tickets', [
            'subject' => 'Cannot access my account',
            'description' => 'Getting a 500 error.',
        ])->assertCreated();

    Notification::assertSentTo(
        $customer->user,
        function (TicketEventNotification $notification) {
            return $notification->eventKey === 'ticket_created'
                && str_contains($notification->body, 'Cannot access my account');
        }
    );

    $log = NotificationLog::where('event_key', 'ticket_created')->first();
    expect($log)->not->toBeNull();
    expect($log->notifiable_id)->toBe($customer->user->id);
    expect($log->status)->toBe(\App\Enums\NotificationLogStatus::Queued);
});

it('notifies the assignee when a ticket is manually assigned', function () {
    Notification::fake();

    $ticket = Ticket::factory()->create();
    $agent = actingAsAgent();
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/assign", ['assignee_id' => $agent->id])
        ->assertOk();

    Notification::assertSentTo($agent, TicketEventNotification::class, fn ($n) => $n->eventKey === 'ticket_assigned');
});

it('does not send a notification when the recipient has disabled that event', function () {
    Notification::fake();

    $customer = Customer::factory()->create();

    NotificationPreference::create([
        'user_id' => $customer->user->id,
        'channel' => 'mail',
        'event_key' => 'ticket_created',
        'enabled' => false,
    ]);

    $this->actingAs($customer->user, 'api')
        ->postJson('/api/v1/tickets', ['subject' => 'x', 'description' => 'y'])
        ->assertCreated();

    Notification::assertNotSentTo($customer->user, TicketEventNotification::class);
});

it('notifies the customer when an agent replies', function () {
    Notification::fake();

    $customer = Customer::factory()->create();
    $ticket = Ticket::factory()->create(['customer_id' => $customer->id]);
    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/messages", ['body' => 'We are on it.'])
        ->assertCreated();

    Notification::assertSentTo($customer->user, TicketEventNotification::class, fn ($n) => $n->eventKey === 'agent_replied');
});

it('does not notify the customer for an internal note', function () {
    Notification::fake();

    $customer = Customer::factory()->create();
    $ticket = Ticket::factory()->create(['customer_id' => $customer->id]);
    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')
        ->postJson("/api/v1/tickets/{$ticket->id}/messages", ['body' => 'Internal only.', 'is_internal' => true])
        ->assertCreated();

    Notification::assertNothingSent();
});
