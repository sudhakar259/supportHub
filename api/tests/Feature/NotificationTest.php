<?php

use App\Enums\NotificationLogStatus;
use App\Models\Customer;
use App\Models\NotificationLog;
use App\Models\NotificationPreference;
use App\Models\SystemSetting;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Notifications\TicketEventNotification;
use App\Services\TenantProvisioningService;
use App\Support\TenantContext;
use Database\Seeders\NotificationTemplateSeeder;
use Database\Seeders\SystemSettingSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    testTenant();
    $this->seed(NotificationTemplateSeeder::class);
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
    expect($log->status)->toBe(NotificationLogStatus::Queued);
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

it('ignores the platform email defaults and signs tenant mail with the tenant\'s own name, contact address and signature', function () {
    $this->seed(SystemSettingSeeder::class);
    $tenant = testTenant();
    $tenant->update(['email' => 'desk@help.test']);

    $mail = app(TenantContext::class)->runAs($tenant, function () {
        return (new TicketEventNotification('ticket_created', 'Subject', 'Body'))->toMail(new Customer);
    });

    expect($mail->from)->toBe([config('mail.from.address'), $tenant->name]);
    expect($mail->replyTo[0])->toBe(['desk@help.test', null]);
    expect($mail->salutation)->toBe("Regards,\n{$tenant->name}");
});

it('lets a tenant override its sender name, reply-to and signature independently of the platform default', function () {
    $this->seed(SystemSettingSeeder::class);
    $tenant = testTenant();

    app(TenantContext::class)->runAs($tenant, function () {
        SystemSetting::create(['tenant_id' => testTenant()->id, 'key' => 'email.sender_name', 'value' => 'Help Support', 'type' => 'string']);
        SystemSetting::create(['tenant_id' => testTenant()->id, 'key' => 'email.reply_to', 'value' => 'help@help.test', 'type' => 'string']);
    });

    $mail = app(TenantContext::class)->runAs($tenant, function () {
        return (new TicketEventNotification('ticket_created', 'Subject', 'Body'))->toMail(new Customer);
    });

    expect($mail->from)->toBe([config('mail.from.address'), 'Help Support']);
    expect($mail->replyTo[0])->toBe(['help@help.test', null]);

    // A sibling tenant that never overrode anything is branded with its own
    // name, not the first tenant's overrides or the platform defaults.
    $tenantB = Tenant::create(['name' => 'Other Org', 'slug' => 'other-org-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($tenantB);

    $mailB = app(TenantContext::class)->runAs($tenantB, function () {
        return (new TicketEventNotification('ticket_created', 'Subject', 'Body'))->toMail(new Customer);
    });

    expect($mailB->from)->toBe([config('mail.from.address'), 'Other Org']);
    expect($mailB->replyTo)->toBe([]);
});
