<?php

use App\Events\TicketCreated;
use App\Listeners\Ticket\SendTicketCreatedNotification;
use App\Models\Customer;
use App\Models\NotificationTemplate;
use App\Models\SystemSetting;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\User;
use App\Notifications\TicketEventNotification;
use App\Services\TenantProvisioningService;
use App\Support\TenantContext;
use App\Models\MembershipPlan;
use App\Models\Subscription;
use Database\Seeders\MembershipPlanSeeder;
use Database\Seeders\NotificationTemplateSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->seed([RolesAndPermissionsSeeder::class, NotificationTemplateSeeder::class]);
    testTenant();
});

it('brands a ticket email with the tenant name, its own contact address and a personal greeting', function () {
    $tenant = testTenant();
    $tenant->update(['email' => 'desk@acme.test']);
    $recipient = User::factory()->create(['tenant_id' => $tenant->id, 'name' => 'Jamie Rivera']);

    $mail = (new TicketEventNotification('ticket_created', 'Ticket created', 'Your ticket was created.', 'https://app.test/tickets/1', null, $tenant->id))
        ->toMail($recipient);

    expect($mail->from)->toBe([config('mail.from.address'), $tenant->name]);
    expect($mail->replyTo[0])->toBe(['desk@acme.test', null]);
    expect($mail->greeting)->toBe('Hello Jamie Rivera,');
    expect($mail->salutation)->toBe("Regards,\n{$tenant->name}");
    expect(implode(' ', $mail->outroLines))->toContain("sent by {$tenant->name}");
});

it('never falls back to the platform sender or contact address for a tenant', function () {
    $tenant = testTenant();
    $recipient = User::factory()->create(['tenant_id' => $tenant->id]);

    $mail = (new TicketEventNotification('ticket_created', 'Subject', 'Body', null, null, $tenant->id))->toMail($recipient);

    expect($mail->from[1])->not->toBe('Support24 Team');
    expect($mail->replyTo)->toBe([]);
    expect($mail->salutation)->not->toContain('Support24');
});

it('uses the tenant\'s own sender name, reply-to and signature when it sets them', function () {
    $tenant = testTenant();
    app(TenantContext::class)->runAs($tenant, function () use ($tenant) {
        SystemSetting::create(['tenant_id' => $tenant->id, 'key' => 'email.sender_name', 'value' => 'Acme Support', 'type' => 'string']);
        SystemSetting::create(['tenant_id' => $tenant->id, 'key' => 'email.reply_to', 'value' => 'help@acme.test', 'type' => 'string']);
        SystemSetting::create(['tenant_id' => $tenant->id, 'key' => 'email.branding_signature', 'value' => 'Thanks,\nAcme', 'type' => 'string']);
    });

    $mail = (new TicketEventNotification('ticket_created', 'Subject', 'Body', null, null, $tenant->id))
        ->toMail(User::factory()->create(['tenant_id' => $tenant->id]));

    expect($mail->from[1])->toBe('Acme Support');
    expect($mail->replyTo[0][0])->toBe('help@acme.test');
    expect($mail->salutation)->toBe('Thanks,\nAcme');
});

it('keeps each tenant\'s branding separate when mail is built outside a request', function () {
    $tenantA = testTenant();
    $tenantB = Tenant::create(['name' => 'Globex Helpdesk', 'slug' => 'globex-'.uniqid(), 'status' => 'active', 'email' => 'help@globex.test']);

    app(TenantContext::class)->clear();

    $mail = (new TicketEventNotification('ticket_created', 'Subject', 'Body', null, null, $tenantB->id))
        ->toMail(new User(['name' => 'Sam']));

    expect($mail->from[1])->toBe('Globex Helpdesk');
    expect($mail->replyTo[0][0])->toBe('help@globex.test');
    expect($tenantA->name)->not->toBe('Globex Helpdesk');
});

it('sends a ticket listener\'s email with the ticket tenant\'s template when no tenant context is set', function () {
    Notification::fake();

    $tenantB = Tenant::create(['name' => 'Globex Helpdesk', 'slug' => 'globex-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($tenantB);
    app(TenantContext::class)->runAs($tenantB, function () use ($tenantB) {
        NotificationTemplate::create([
            'tenant_id' => $tenantB->id,
            'key' => 'ticket_created',
            'name' => 'Globex ticket created',
            'subject' => 'Globex ticket {ticket_number} received',
            'body' => 'We have your request.',
            'channel' => 'mail',
            'is_active' => true,
        ]);
    });

    $ticket = app(TenantContext::class)->runAs($tenantB, function () {
        $customer = Customer::factory()->create();

        return Ticket::factory()->create(['customer_id' => $customer->id]);
    });

    app(TenantContext::class)->clear();
    app(SendTicketCreatedNotification::class)->handle(new TicketCreated($ticket));

    Notification::assertSentTo(
        $ticket->customer->user,
        TicketEventNotification::class,
        fn (TicketEventNotification $notification) => $notification->tenantId === $tenantB->id
            && str_starts_with($notification->subject, 'Globex ticket'),
    );
});


function customDomainMail(string $planSlug, bool $verified): array
{
    (new MembershipPlanSeeder)->run();
    $tenant = testTenant();
    Subscription::updateOrCreate(['tenant_id' => $tenant->id], [
        'membership_plan_id' => MembershipPlan::where('slug', $planSlug)->value('id'), 'status' => 'active',
    ]);
    SystemSetting::create(['tenant_id' => $tenant->id, 'key' => 'email.sending_domain', 'value' => 'crevol.com', 'type' => 'string']);
    SystemSetting::create(['tenant_id' => $tenant->id, 'key' => 'email.domain_verified', 'value' => $verified ? '1' : '0', 'type' => 'boolean']);

    return [(new TicketEventNotification('ticket_created', 'S', 'B', null, null, $tenant->id))
        ->toMail(User::factory()->create(['tenant_id' => $tenant->id])), $tenant];
}

it('sends from the tenant\'s verified domain on a plan above Starter', function () {
    [$mail] = customDomainMail('professional', true);

    expect($mail->from[0])->toBe('support@crevol.com');
});

it('keeps the platform address on the Starter plan even with a verified domain', function () {
    [$mail] = customDomainMail('starter', true);

    expect($mail->from[0])->toBe(config('mail.from.address'));
});

it('keeps the platform address until the domain is verified', function () {
    [$mail] = customDomainMail('business', false);

    expect($mail->from[0])->toBe(config('mail.from.address'));
});

it('stops a tenant marking its own sending domain verified', function () {
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->putJson('/api/v1/settings', ['settings' => [['key' => 'email.domain_verified', 'value' => '1']]])
        ->assertStatus(403);
});

it('lets a platform admin verify a tenant\'s sending domain', function () {
    $tenant = testTenant();
    $platformAdmin = actingAsPlatformAdmin();

    $this->actingAs($platformAdmin, 'api')
        ->putJson("/api/v1/platform/tenants/{$tenant->id}/email-domain", ['verified' => true])
        ->assertStatus(422);

    SystemSetting::create(['tenant_id' => $tenant->id, 'key' => 'email.sending_domain', 'value' => 'crevol.com', 'type' => 'string']);

    $this->actingAs($platformAdmin, 'api')
        ->putJson("/api/v1/platform/tenants/{$tenant->id}/email-domain", ['verified' => true])
        ->assertOk();

    expect(SystemSetting::withoutTenantScope()->where('tenant_id', $tenant->id)->where('key', 'email.domain_verified')->value('value'))->toBe('1');
});
