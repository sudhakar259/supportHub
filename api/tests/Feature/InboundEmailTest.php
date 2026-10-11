<?php

use App\Models\Customer;
use App\Models\InboundEmail;
use App\Models\Ticket;
use App\Models\User;
use App\Notifications\TicketEventNotification;
use App\Services\InboundEmail\InboundEmailSettings;
use App\Support\TenantContext;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

beforeEach(function () {
    Storage::fake();
    config(['inbound_email.domain' => 'inbound.test', 'inbound_email.mailgun_signing_key' => 'test-key']);
    $this->tenant = testTenant();
    InboundEmailSettings::save($this->tenant, true, true);
});

/** POST a Mailgun-style inbound email with a valid (or deliberately wrong) signature. */
function sendInbound($test, array $fields, array $files = [], string $key = 'test-key', ?int $timestamp = null, ?string $token = null)
{
    $timestamp ??= time();
    $token ??= Str::random(50);
    $fields += ['recipient' => $test->tenant->slug.'@inbound.test'];

    return $test->post('/api/v1/inbound-email/mailgun', $fields + $files + [
        'timestamp' => $timestamp,
        'token' => $token,
        'signature' => hash_hmac('sha256', $timestamp.$token, $key),
    ], ['Accept' => 'application/json']);
}

function inboundMail(array $overrides = []): array
{
    return $overrides + [
        'from' => 'Jamie Rivera <jamie@example.com>',
        'sender' => 'jamie@example.com',
        'subject' => 'Cannot log in',
        'body-plain' => "Hello,\n\nI cannot log in to my account.\n\nThanks,\nJamie",
        'stripped-text' => 'I cannot log in to my account.',
        'Message-Id' => '<'.Str::random(12).'@mail.example.com>',
    ];
}

function inTenant($test, callable $callback)
{
    return app(TenantContext::class)->runAs($test->tenant, $callback);
}

it('rejects a request with a wrong, stale or reused signature', function () {
    sendInbound($this, inboundMail(), key: 'wrong-key')->assertStatus(401);
    sendInbound($this, inboundMail(), timestamp: time() - 3600)->assertStatus(401);

    $this->post('/api/v1/inbound-email/mailgun', inboundMail(), ['Accept' => 'application/json'])->assertStatus(401);

    sendInbound($this, inboundMail(), token: 'same-token')->assertOk();
    sendInbound($this, inboundMail(), token: 'same-token')->assertStatus(401);

    expect(Ticket::count())->toBe(1);
});

it('refuses everything when no signing key is configured', function () {
    config(['inbound_email.mailgun_signing_key' => null]);

    sendInbound($this, inboundMail(), key: '')->assertStatus(401);
});

it('answers 406 for an address that is not a workspace address', function () {
    sendInbound($this, inboundMail(['recipient' => 'nobody@inbound.test']))->assertStatus(406);
    sendInbound($this, inboundMail(['recipient' => $this->tenant->slug.'@elsewhere.test']))->assertStatus(406);
});

it('creates a customer and a ticket from an email by an unknown sender', function () {
    sendInbound($this, inboundMail())->assertOk()->assertJsonPath('status', 'ticket_created');

    inTenant($this, function () {
        $ticket = Ticket::firstOrFail();
        expect($ticket->subject)->toBe('Cannot log in')
            ->and($ticket->description)->toContain('I cannot log in to my account.')
            ->and($ticket->customer->user->email)->toBe('jamie@example.com')
            ->and($ticket->customer->user->name)->toBe('Jamie Rivera')
            ->and($ticket->customer->user->hasRole('Customer'))->toBeTrue();

        $log = InboundEmail::firstOrFail();
        expect($log->status)->toBe('ticket_created')->and($log->ticket_id)->toBe($ticket->id);
    });
});

it('attaches the ticket to an existing customer instead of creating a new one', function () {
    $customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);
    $email = $customer->user->email;

    sendInbound($this, inboundMail(['from' => $email, 'sender' => $email]))->assertOk();

    inTenant($this, function () use ($customer, $email) {
        expect(Ticket::firstOrFail()->customer_id)->toBe($customer->id)
            ->and(User::where('email', $email)->count())->toBe(1);
    });
});

it('does nothing but record it when email-to-ticket is switched off', function () {
    InboundEmailSettings::save($this->tenant, false, true);

    sendInbound($this, inboundMail())->assertOk()->assertJsonPath('status', 'rejected_disabled');

    inTenant($this, fn () => expect(Ticket::count())->toBe(0));
});

it('rejects unknown senders when creating customers is turned off, but still takes known customers', function () {
    InboundEmailSettings::save($this->tenant, true, false);
    $customer = Customer::factory()->create(['tenant_id' => $this->tenant->id]);

    sendInbound($this, inboundMail())->assertJsonPath('status', 'rejected_unknown_sender');
    $email = $customer->user->email;
    sendInbound($this, inboundMail(['from' => $email, 'sender' => $email]))->assertJsonPath('status', 'ticket_created');

    inTenant($this, fn () => expect(Ticket::count())->toBe(1));
});

it('ignores a retry of an email it already handled', function () {
    $mail = inboundMail(['Message-Id' => '<same@mail.example.com>']);

    sendInbound($this, $mail)->assertOk();
    sendInbound($this, $mail)->assertOk()->assertJsonPath('status', 'ticket_created');

    inTenant($this, fn () => expect(Ticket::count())->toBe(1)->and(InboundEmail::count())->toBe(1));
});

it('adds a reply to the ticket named in the subject, using the text without quoted history', function () {
    sendInbound($this, inboundMail())->assertOk();
    $ticket = inTenant($this, fn () => Ticket::firstOrFail());

    sendInbound($this, inboundMail([
        'subject' => "Re: We received your ticket {$ticket->ticket_number}",
        'body-plain' => "Any news?\n\n> On Monday we wrote:\n> quoted history",
        'stripped-text' => 'Any news?',
    ]))->assertOk()->assertJsonPath('status', 'reply_added');

    inTenant($this, function () use ($ticket) {
        expect(Ticket::count())->toBe(1);
        $message = $ticket->messages()->latest('id')->first();
        expect($message->body)->toBe('Any news?')
            ->and($message->type->value)->toBe('customer_message');
    });
});

it('reopens a resolved ticket when the customer answers by email', function () {
    sendInbound($this, inboundMail())->assertOk();
    $ticket = inTenant($this, function () {
        $ticket = Ticket::firstOrFail();
        app(\App\Actions\Ticket\UpdateTicketStatusAction::class)->execute($ticket, 'resolved');

        return $ticket;
    });

    sendInbound($this, inboundMail(['subject' => "Re: {$ticket->ticket_number}"]))->assertJsonPath('status', 'reply_added');

    inTenant($this, fn () => expect($ticket->fresh()->status->slug)->toBe('reopened'));
});

it('follows In-Reply-To to the right ticket even when the subject has no ticket number', function () {
    sendInbound($this, inboundMail(['Message-Id' => '<first@mail.example.com>']))->assertOk();

    sendInbound($this, inboundMail([
        'subject' => 'Totally different words',
        'In-Reply-To' => '<first@mail.example.com>',
        'References' => '<first@mail.example.com>',
    ]))->assertJsonPath('status', 'reply_added');

    inTenant($this, fn () => expect(Ticket::count())->toBe(1));
});

it('does not let someone else write into a ticket just because they know its number', function () {
    sendInbound($this, inboundMail())->assertOk();
    $ticket = inTenant($this, fn () => Ticket::firstOrFail());

    sendInbound($this, inboundMail([
        'from' => 'Mallory <mallory@evil.test>', 'sender' => 'mallory@evil.test',
        'subject' => "Re: {$ticket->ticket_number}",
    ]))->assertJsonPath('status', 'ticket_created');

    inTenant($this, fn () => expect(Ticket::count())->toBe(2)->and($ticket->messages()->count())->toBe(0));
});

it('opens a new ticket that points back to a closed one when the customer writes again', function () {
    sendInbound($this, inboundMail())->assertOk();
    $ticket = inTenant($this, function () {
        $ticket = Ticket::firstOrFail();
        $actions = app(\App\Actions\Ticket\UpdateTicketStatusAction::class);
        $actions->execute($ticket, 'resolved');
        $actions->execute($ticket->fresh(), 'closed');

        return $ticket;
    });

    sendInbound($this, inboundMail(['subject' => "Re: {$ticket->ticket_number}", 'body-plain' => 'It is broken again']))
        ->assertJsonPath('status', 'ticket_created');

    inTenant($this, function () use ($ticket) {
        $new = Ticket::where('id', '!=', $ticket->id)->firstOrFail();
        expect($new->description)->toContain("Follow-up to closed ticket {$ticket->ticket_number}")->toContain('It is broken again');
    });
});

it('does not turn staff mail, auto-replies or bounces into tickets', function () {
    $agent = actingAsAgent($this->tenant);

    sendInbound($this, inboundMail(['from' => $agent->email, 'sender' => $agent->email]))->assertJsonPath('status', 'ignored_staff_sender');
    sendInbound($this, inboundMail(['message-headers' => json_encode([['Auto-Submitted', 'auto-replied']])]))->assertJsonPath('status', 'ignored_auto_generated');
    sendInbound($this, inboundMail(['message-headers' => json_encode([['Precedence', 'bulk']])]))->assertJsonPath('status', 'ignored_auto_generated');
    sendInbound($this, inboundMail(['message-headers' => json_encode([['Return-Path', '<>']])]))->assertJsonPath('status', 'ignored_auto_generated');
    sendInbound($this, inboundMail(['from' => 'MAILER-DAEMON@example.com', 'sender' => 'mailer-daemon@example.com']))->assertJsonPath('status', 'ignored_auto_generated');
    sendInbound($this, inboundMail(['from' => $this->tenant->slug.'@inbound.test', 'sender' => $this->tenant->slug.'@inbound.test']))->assertJsonPath('status', 'ignored_auto_generated');

    inTenant($this, fn () => expect(Ticket::count())->toBe(0));
});

it('saves allowed attachments on the ticket and skips the ones that are not allowed', function () {
    sendInbound($this, inboundMail(), [
        'attachment-1' => UploadedFile::fake()->create('error.png', 100, 'image/png'),
        'attachment-2' => UploadedFile::fake()->create('bundle.zip', 100, 'application/zip'),
        'attachment-3' => UploadedFile::fake()->create('huge.pdf', 3000, 'application/pdf'),
        'attachment-4' => UploadedFile::fake()->create('notes.txt', 5, 'text/plain'),
    ])->assertOk();

    inTenant($this, function () {
        $ticket = Ticket::firstOrFail();
        expect($ticket->attachments()->pluck('original_filename')->sort()->values()->all())->toBe(['error.png', 'notes.txt']);

        $log = InboundEmail::firstOrFail();
        expect($log->attachments_saved)->toBe(2)->and($log->attachments_skipped)->toBe(2)->and($log->note)->toContain('2 attachment(s) were skipped');
    });
});

it('links attachments on an emailed reply to that reply', function () {
    sendInbound($this, inboundMail())->assertOk();
    $ticket = inTenant($this, fn () => Ticket::firstOrFail());

    sendInbound($this, inboundMail(['subject' => "Re: {$ticket->ticket_number}"]), [
        'attachment-1' => UploadedFile::fake()->create('screenshot.png', 100, 'image/png'),
    ])->assertJsonPath('status', 'reply_added');

    inTenant($this, function () use ($ticket) {
        $message = $ticket->messages()->latest('id')->first();
        expect($message->attachments()->count())->toBe(1)->and($ticket->attachments()->whereNull('ticket_message_id')->count())->toBe(0);
    });
});

it('handles an HTML-only email and a missing subject', function () {
    sendInbound($this, [
        'from' => 'jamie@example.com', 'sender' => 'jamie@example.com', 'Message-Id' => '<h@x>',
        'body-html' => '<p>Hello <b>team</b></p><p>It&#39;s broken</p>',
    ])->assertJsonPath('status', 'ticket_created');

    inTenant($this, function () {
        $ticket = Ticket::firstOrFail();
        expect($ticket->subject)->toBe('(no subject)')->and($ticket->description)->toBe("Hello team\n\nIt's broken");
    });
});

it('does not cross workspaces: mail to one workspace never lands in another', function () {
    $other = \App\Models\Tenant::create(['name' => 'Other Org', 'slug' => 'other-'.uniqid(), 'status' => 'active']);
    app(\App\Services\TenantProvisioningService::class)->provision($other);
    InboundEmailSettings::save($other, true, true);

    sendInbound($this, inboundMail(['recipient' => $other->slug.'@inbound.test']))->assertOk();

    inTenant($this, fn () => expect(Ticket::count())->toBe(0));
    app(TenantContext::class)->runAs($other, fn () => expect(Ticket::count())->toBe(1));
});

it('lets an administrator see the address, switch the feature on and read the log', function () {
    $admin = actingAsAdministrator($this->tenant);
    InboundEmailSettings::save($this->tenant, false, true);

    $this->actingAs($admin, 'api')->getJson('/api/v1/inbound-email')
        ->assertOk()
        ->assertJsonPath('data.address', $this->tenant->slug.'@inbound.test')
        ->assertJsonPath('data.enabled', false)
        ->assertJsonPath('data.available', true);

    $this->actingAs($admin, 'api')->putJson('/api/v1/inbound-email', ['enabled' => true, 'create_customers' => false])
        ->assertOk()->assertJsonPath('data.enabled', true)->assertJsonPath('data.create_customers', false);

    sendInbound($this, inboundMail())->assertOk();

    $this->actingAs($admin, 'api')->getJson('/api/v1/inbound-email/log')
        ->assertOk()
        ->assertJsonPath('data.0.from_email', 'jamie@example.com')
        ->assertJsonPath('data.0.status', 'rejected_unknown_sender')
        ->assertJsonPath('meta.total', 1);
});

it('keeps email-to-ticket settings away from agents and customers, and refuses to enable it without a platform domain', function () {
    $agent = actingAsAgent($this->tenant);
    $this->actingAs($agent, 'api')->putJson('/api/v1/inbound-email', ['enabled' => true, 'create_customers' => true])->assertForbidden();
    $this->actingAs($agent, 'api')->getJson('/api/v1/inbound-email/log')->assertForbidden();

    config(['inbound_email.domain' => null]);
    $admin = actingAsAdministrator($this->tenant);
    $this->actingAs($admin, 'api')->putJson('/api/v1/inbound-email', ['enabled' => true, 'create_customers' => true])->assertStatus(422);
    $this->actingAs($admin, 'api')->getJson('/api/v1/inbound-email')->assertJsonPath('data.available', false)->assertJsonPath('data.address', null);
});

it('makes a customer\'s email reply go back to the workspace inbound address, but not an agent\'s', function () {
    $customer = actingAsCustomer($this->tenant);
    $agent = actingAsAgent($this->tenant);
    $notification = new TicketEventNotification('ticket_created', 'Subject', 'Body', null, null, $this->tenant->id);

    $forCustomer = app(TenantContext::class)->runAs($this->tenant, fn () => $notification->toMail($customer));
    $forAgent = app(TenantContext::class)->runAs($this->tenant, fn () => $notification->toMail($agent));

    expect($forCustomer->replyTo[0][0])->toBe($this->tenant->slug.'@inbound.test')
        ->and($forAgent->replyTo)->not->toContain([$this->tenant->slug.'@inbound.test', null]);
});

it('puts the agent\'s reply text in the email the customer receives', function () {
    (new \Database\Seeders\NotificationTemplateSeeder)->run();
    Notification::fake();
    $customer = Customer::factory()->create();
    $ticket = Ticket::factory()->create(['customer_id' => $customer->id]);
    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')->postJson("/api/v1/tickets/{$ticket->id}/messages", ['body' => 'Please clear your cache and retry.'])->assertCreated();

    Notification::assertSentTo($customer->user, TicketEventNotification::class, fn ($n) => $n->eventKey === 'agent_replied' && str_contains($n->body, 'Please clear your cache and retry.'));
});
