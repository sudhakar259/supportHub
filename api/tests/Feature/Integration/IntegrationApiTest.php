<?php

use App\Models\Customer;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Services\TenantProvisioningService;

beforeEach(function () {
    testTenant();
});

it('rejects a request with missing or invalid API credentials', function () {
    $this->getJson('/api/v1/integration/customers')->assertStatus(401);

    $this->withHeaders(['X-Api-Key' => 'bogus', 'X-Api-Secret' => 'bogus'])
        ->getJson('/api/v1/integration/customers')
        ->assertStatus(401);
});

it('creates a customer via the integration API and looks it up by external_id', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant);

    $response = withIntegrationAuth($this, $pair)
        ->postJson('/api/v1/integration/customers', [
            'name' => 'Jamie Rivera',
            'email' => 'jamie@example.com',
            'external_id' => 'CRM-001',
        ])
        ->assertCreated()
        ->assertJsonPath('data.external_id', 'CRM-001');

    expect(Customer::where('external_id', 'CRM-001')->exists())->toBeTrue();

    withIntegrationAuth($this, $pair)
        ->getJson('/api/v1/integration/customers/lookup?external_id=CRM-001')
        ->assertOk()
        ->assertJsonPath('data.id', $response->json('data.id'));

    withIntegrationAuth($this, $pair)
        ->getJson('/api/v1/integration/customers/lookup?email=jamie@example.com')
        ->assertOk()
        ->assertJsonPath('data.id', $response->json('data.id'));
});

it('enforces scopes — a read-only credential cannot create a customer', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['customers.read']);

    withIntegrationAuth($this, $pair)
        ->postJson('/api/v1/integration/customers', ['name' => 'x', 'email' => 'x@example.com'])
        ->assertStatus(403);
});

it('never lets one tenant\'s credential see another tenant\'s customers', function () {
    $tenantA = testTenant();
    $customerA = Customer::factory()->create(['tenant_id' => $tenantA->id]);

    $tenantB = Tenant::create(['name' => 'Other Org', 'slug' => 'other-org-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($tenantB);
    $pairB = createIntegrationCredential($tenantB);

    withIntegrationAuth($this, $pairB)
        ->getJson("/api/v1/integration/customers/{$customerA->id}")
        ->assertStatus(404);

    $listResponse = withIntegrationAuth($this, $pairB)->getJson('/api/v1/integration/customers')->assertOk();
    expect(collect($listResponse->json('data'))->pluck('id'))->not->toContain($customerA->id);
});

it('creates a ticket for a customer identified by email, and replies as that customer', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant);
    $customer = Customer::factory()->create(['tenant_id' => $tenant->id]);

    $response = withIntegrationAuth($this, $pair)
        ->postJson('/api/v1/integration/tickets', [
            'subject' => 'Synced from chat widget',
            'description' => 'Customer asked about billing.',
            'customer_email' => $customer->user->email,
        ])
        ->assertCreated()
        ->assertJsonPath('data.subject', 'Synced from chat widget');

    $ticketId = $response->json('data.id');

    withIntegrationAuth($this, $pair)
        ->postJson("/api/v1/integration/tickets/{$ticketId}/messages", ['body' => 'Any update?'])
        ->assertCreated()
        ->assertJsonPath('data.body', 'Any update?')
        ->assertJsonPath('data.author.id', $customer->user->id);
});

it('transitions a ticket\'s status through the integration API', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant);
    $ticket = Ticket::factory()->create(['tenant_id' => $tenant->id]);

    withIntegrationAuth($this, $pair)
        ->postJson("/api/v1/integration/tickets/{$ticket->id}/status", ['status' => 'in-progress'])
        ->assertOk()
        ->assertJsonPath('data.status.slug', 'in-progress');

    withIntegrationAuth($this, $pair)
        ->postJson("/api/v1/integration/tickets/{$ticket->id}/status", ['status' => 'closed'])
        ->assertStatus(422);
});

it('404s addressing another tenant\'s ticket via the integration API', function () {
    $tenantA = testTenant();
    $ticketA = Ticket::factory()->create(['tenant_id' => $tenantA->id]);

    $tenantB = Tenant::create(['name' => 'Other Org', 'slug' => 'other-org-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($tenantB);
    $pairB = createIntegrationCredential($tenantB);

    withIntegrationAuth($this, $pairB)
        ->getJson("/api/v1/integration/tickets/{$ticketA->id}")
        ->assertStatus(404);
});

it('rejects a revoked credential', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant);
    $pair['credential']->update(['status' => 'revoked', 'revoked_at' => now()]);

    withIntegrationAuth($this, $pair)
        ->getJson('/api/v1/integration/customers')
        ->assertStatus(401);
});

it('lists a ticket\'s thread via the integration API without internal notes', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['tickets.read']);
    $ticket = Ticket::factory()->create(['tenant_id' => $tenant->id]);
    $author = $ticket->customer->user;

    foreach ([
        ['customer_message', 'Hello, I need help'],
        ['agent_reply', 'Sure, what is the problem?'],
        ['internal_note', 'Customer seems upset'],
    ] as [$type, $body]) {
        $ticket->messages()->create(['tenant_id' => $tenant->id, 'author_id' => $author->id, 'type' => $type, 'body' => $body]);
    }

    $response = withIntegrationAuth($this, $pair)
        ->getJson("/api/v1/integration/tickets/{$ticket->id}/messages")
        ->assertOk();

    expect(collect($response->json('data'))->pluck('type')->all())
        ->toBe(['customer_message', 'agent_reply']);
    expect($response->getContent())->not->toContain('Customer seems upset');
});

it('requires tickets.read to list a ticket\'s messages', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['customers.read']);
    $ticket = Ticket::factory()->create(['tenant_id' => $tenant->id]);

    withIntegrationAuth($this, $pair)
        ->getJson("/api/v1/integration/tickets/{$ticket->id}/messages")
        ->assertStatus(403);
});

it('lets a customer reopen a resolved ticket via the integration API', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['tickets.reopen']);
    $ticket = Ticket::factory()->create(['tenant_id' => $tenant->id]);

    app(\App\Actions\Ticket\UpdateTicketStatusAction::class)->execute($ticket, 'resolved');

    withIntegrationAuth($this, $pair)
        ->postJson("/api/v1/integration/tickets/{$ticket->id}/reopen", ['reason' => 'Still broken'])
        ->assertOk()
        ->assertJsonPath('data.status.slug', 'reopened');

    expect($ticket->fresh()->reopened_count)->toBe(1);
});

it('refuses to reopen a ticket that is not resolved or closed', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['tickets.reopen']);
    $ticket = Ticket::factory()->create(['tenant_id' => $tenant->id]);

    withIntegrationAuth($this, $pair)
        ->postJson("/api/v1/integration/tickets/{$ticket->id}/reopen")
        ->assertStatus(422);
});

it('requires the tickets.reopen scope to reopen', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['tickets.reply']);
    $ticket = Ticket::factory()->create(['tenant_id' => $tenant->id]);

    withIntegrationAuth($this, $pair)
        ->postJson("/api/v1/integration/tickets/{$ticket->id}/reopen")
        ->assertStatus(403);
});

it('creates a ticket in the chosen department and priority via the integration API', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['tickets.create']);
    $customer = Customer::factory()->create(['tenant_id' => $tenant->id]);
    $department = \App\Models\Department::factory()->create(['tenant_id' => $tenant->id, 'is_active' => true]);
    $high = \App\Models\TicketPriority::where('slug', 'high')->first();

    $response = withIntegrationAuth($this, $pair)
        ->postJson('/api/v1/integration/tickets', [
            'subject' => 'Checkout is down',
            'description' => 'Cannot pay.',
            'customer_id' => $customer->id,
            'department_id' => $department->id,
            'priority_id' => $high->id,
        ])
        ->assertCreated();

    $ticket = Ticket::find($response->json('data.id'));
    expect($ticket->department_id)->toBe($department->id)
        ->and($ticket->priority_id)->toBe($high->id);
});

it('rejects an inactive or foreign department when creating an integration ticket', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['tickets.create']);
    $customer = Customer::factory()->create(['tenant_id' => $tenant->id]);
    $inactive = \App\Models\Department::factory()->create(['tenant_id' => $tenant->id, 'is_active' => false]);

    $other = Tenant::create(['name' => 'Other Org', 'slug' => 'other-'.uniqid(), 'status' => 'active']);
    $foreign = \App\Models\Department::factory()->create(['tenant_id' => $other->id, 'is_active' => true]);

    foreach ([$inactive->id, $foreign->id] as $departmentId) {
        withIntegrationAuth($this, $pair)
            ->postJson('/api/v1/integration/tickets', [
                'subject' => 'x', 'description' => 'y',
                'customer_id' => $customer->id, 'department_id' => $departmentId,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['department_id']);
    }
});

it('lists priorities, active departments and categories for the credential\'s tenant only', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['tickets.create']);
    $active = \App\Models\Department::factory()->create(['tenant_id' => $tenant->id, 'is_active' => true]);
    $inactive = \App\Models\Department::factory()->create(['tenant_id' => $tenant->id, 'is_active' => false]);

    $other = Tenant::create(['name' => 'Other Org', 'slug' => 'other-'.uniqid(), 'status' => 'active']);
    $foreign = \App\Models\Department::factory()->create(['tenant_id' => $other->id, 'is_active' => true]);

    $departments = withIntegrationAuth($this, $pair)->getJson('/api/v1/integration/departments')->assertOk()->json('data');
    expect(collect($departments)->pluck('id')->all())->toContain($active->id)->not->toContain($inactive->id)->not->toContain($foreign->id);

    $priorities = withIntegrationAuth($this, $pair)->getJson('/api/v1/integration/priorities')->assertOk()->json('data');
    expect(collect($priorities)->pluck('slug')->all())->toContain('high');

    withIntegrationAuth($this, $pair)->getJson('/api/v1/integration/categories')->assertOk();

    $readOnly = createIntegrationCredential($tenant, ['tickets.read']);
    withIntegrationAuth($this, $readOnly)->getJson('/api/v1/integration/departments')->assertStatus(403);
});

it('emails a new integration customer a link to set their own password when send_invite is true', function () {
    \Illuminate\Support\Facades\Notification::fake();
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['customers.create']);

    withIntegrationAuth($this, $pair)
        ->postJson('/api/v1/integration/customers', ['name' => 'Jamie', 'email' => 'jamie@example.com', 'send_invite' => true])
        ->assertCreated();

    $user = \App\Models\User::where('email', 'jamie@example.com')->first();
    \Illuminate\Support\Facades\Notification::assertSentTo($user, \Illuminate\Auth\Notifications\ResetPassword::class, function ($notification) use ($user, $tenant) {
        $url = $notification->toMail($user)->actionUrl;

        return str_contains($url, '/reset-password?token=')
            && str_contains($url, 'tenant='.$tenant->slug);
    });
});

it('does not email the customer unless send_invite is set', function () {
    \Illuminate\Support\Facades\Notification::fake();
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['customers.create']);

    withIntegrationAuth($this, $pair)
        ->postJson('/api/v1/integration/customers', ['name' => 'Quiet', 'email' => 'quiet@example.com'])
        ->assertCreated();

    \Illuminate\Support\Facades\Notification::assertNothingSent();
});

it('lets an invited customer set a password through the emailed link and then use the workspace', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['customers.create']);

    $token = null;
    \Illuminate\Support\Facades\Notification::fake();
    withIntegrationAuth($this, $pair)
        ->postJson('/api/v1/integration/customers', ['name' => 'Jamie', 'email' => 'jamie@example.com', 'send_invite' => true])
        ->assertCreated();
    $user = \App\Models\User::where('email', 'jamie@example.com')->first();
    \Illuminate\Support\Facades\Notification::assertSentTo($user, \Illuminate\Auth\Notifications\ResetPassword::class, function ($n) use (&$token) {
        $token = $n->token;

        return true;
    });

    expect($user->email_verified_at)->toBeNull();

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => $token, 'email' => 'jamie@example.com', 'tenant' => $tenant->slug,
        'password' => 'Str0ng!Passw0rd#1', 'password_confirmation' => 'Str0ng!Passw0rd#1',
    ])->assertOk();

    $login = $this->postJson('/api/v1/auth/login', ['email' => 'jamie@example.com', 'password' => 'Str0ng!Passw0rd#1', 'tenant' => $tenant->slug])
        ->assertOk()->json('data.token');

    $this->app['auth']->forgetGuards();
    $this->withToken($login)->getJson('/api/v1/tickets')->assertOk();
});
