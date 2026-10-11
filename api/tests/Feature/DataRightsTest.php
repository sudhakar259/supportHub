<?php

use App\Actions\Ticket\UploadTicketAttachmentAction;
use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\InboundEmail;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\User;
use App\Services\CustomerDataService;
use App\Services\TenantProvisioningService;
use App\Support\TenantContext;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake();
    $this->tenant = testTenant();
});

/** A customer with one ticket carrying a customer message, an agent reply, an internal note and a file. */
function customerWithHistory(): array
{
    $tenant = testTenant();
    $agent = actingAsAgent($tenant);

    return app(TenantContext::class)->runAs($tenant, function () use ($tenant, $agent) {
        $user = User::factory()->create(['tenant_id' => $tenant->id, 'name' => 'Jamie Rivera', 'email' => 'jamie@example.com', 'phone' => '+1-555-0100']);
        $user->assignRole('Customer');
        $customer = Customer::factory()->create(['user_id' => $user->id, 'tenant_id' => $tenant->id, 'company_name' => 'Help', 'phone' => '+1-555-0100', 'external_id' => 'wp-user-9']);
        $ticket = Ticket::factory()->create(['tenant_id' => $tenant->id, 'customer_id' => $customer->id, 'subject' => 'My card was charged twice', 'description' => 'Card ending 4242 charged twice']);

        $ticket->messages()->create(['author_id' => $user->id, 'type' => 'customer_message', 'body' => 'Please refund me, I live at 1 Main St']);
        $ticket->messages()->create(['author_id' => $agent->id, 'type' => 'agent_reply', 'body' => 'Refund issued.']);
        $ticket->messages()->create(['author_id' => $agent->id, 'type' => 'internal_note', 'body' => 'Customer Jamie seems upset, escalate']);
        $attachment = app(UploadTicketAttachmentAction::class)->execute($ticket, UploadedFile::fake()->create('statement.pdf', 50, 'application/pdf'), $user);

        InboundEmail::create(['message_id' => 'm1', 'from_email' => 'jamie@example.com', 'from_name' => 'Jamie Rivera', 'subject' => 'Charged twice', 'recipient' => 'x@inbound.test', 'status' => 'ticket_created']);
        AuditLog::create(['actor_id' => $user->id, 'actor_type' => 'user', 'action' => 'ticket.created', 'auditable_type' => $ticket->getMorphClass(), 'auditable_id' => $ticket->id, 'new_values' => ['description' => 'Card ending 4242 charged twice'], 'ip_address' => '203.0.113.9']);
        AuditLog::create(['actor_id' => $user->id, 'actor_type' => 'user', 'action' => 'auth.login', 'auditable_type' => $user->getMorphClass(), 'auditable_id' => $user->id, 'new_values' => ['email' => 'jamie@example.com'], 'ip_address' => '203.0.113.9']);
        $user->createToken('web');

        return [$customer, $user, $ticket, $attachment, $agent];
    });
}

// ---- Export ---------------------------------------------------------------------------------

it('exports everything held about a customer, without internal notes or staff names', function () {
    [$customer, , , , $agent] = customerWithHistory();
    $admin = actingAsAdministrator($this->tenant);

    $response = $this->actingAs($admin, 'api')->get("/api/v1/customers/{$customer->id}/export")->assertOk();
    $data = json_decode($response->streamedContent(), true);

    expect($response->headers->get('content-disposition'))->toContain('customer-'.$customer->id.'-data-')
        ->and($data['customer'])->toMatchArray(['name' => 'Jamie Rivera', 'email' => 'jamie@example.com', 'company_name' => 'Help', 'external_id' => 'wp-user-9'])
        ->and($data['tickets'])->toHaveCount(1)
        ->and($data['tickets'][0]['subject'])->toBe('My card was charged twice')
        ->and(collect($data['tickets'][0]['messages'])->pluck('from')->all())->toBe(['customer', 'support team'])
        ->and($data['tickets'][0]['attachments'][0]['filename'])->toBe('statement.pdf')
        ->and($data['emails_received'][0]['subject'])->toBe('Charged twice');

    $raw = $response->streamedContent();
    expect($raw)->not->toContain('seems upset')->not->toContain($agent->name);
});

it('records an export in the audit log', function () {
    [$customer] = customerWithHistory();
    $admin = actingAsAdministrator($this->tenant);

    $this->actingAs($admin, 'api')->get("/api/v1/customers/{$customer->id}/export")->assertOk();

    expect(AuditLog::where('action', 'customer.exported')->where('actor_id', $admin->id)->exists())->toBeTrue();
});

it('keeps export and erasure away from agents and customers, and from other workspaces', function () {
    [$customer, $user] = customerWithHistory();
    $agent = actingAsAgent($this->tenant);

    foreach ([$agent, $user] as $who) {
        $this->actingAs($who, 'api')->get("/api/v1/customers/{$customer->id}/export")->assertForbidden();
        $this->actingAs($who, 'api')->postJson("/api/v1/customers/{$customer->id}/erase", ['confirm_email' => 'jamie@example.com'])->assertForbidden();
    }

    $other = Tenant::create(['name' => 'Other Org', 'slug' => 'other-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($other);
    $foreignAdmin = actingAsAdministrator($other);
    $this->actingAs($foreignAdmin, 'api')->get("/api/v1/customers/{$customer->id}/export")->assertNotFound();
    $this->actingAs($foreignAdmin, 'api')->postJson("/api/v1/customers/{$customer->id}/erase", ['confirm_email' => 'jamie@example.com'])->assertNotFound();
});

// ---- Erasure --------------------------------------------------------------------------------

it('refuses to erase without the customer\'s email typed back, and changes nothing', function () {
    [$customer, $user] = customerWithHistory();
    $admin = actingAsAdministrator($this->tenant);

    $this->actingAs($admin, 'api')->postJson("/api/v1/customers/{$customer->id}/erase", [])->assertStatus(422);
    $this->actingAs($admin, 'api')->postJson("/api/v1/customers/{$customer->id}/erase", ['confirm_email' => 'someone-else@example.com'])
        ->assertStatus(422)->assertJsonValidationErrors('confirm_email');

    expect($user->fresh()->email)->toBe('jamie@example.com')->and($user->fresh()->is_active)->toBeTrue();
});

it('anonymizes the person everywhere and removes the content of their tickets by default', function () {
    [$customer, $user, $ticket, $attachment] = customerWithHistory();
    $admin = actingAsAdministrator($this->tenant);
    $disk = $attachment->disk;
    $path = $attachment->path;
    expect(Storage::disk($disk)->exists($path))->toBeTrue();

    $this->actingAs($admin, 'api')->postJson("/api/v1/customers/{$customer->id}/erase", ['confirm_email' => ' JAMIE@example.com '])
        ->assertOk()
        ->assertJsonPath('data.tickets', 1)
        ->assertJsonPath('data.messages_redacted', 3)
        ->assertJsonPath('data.attachments_removed', 1)
        ->assertJsonPath('data.redacted_content', true);

    $user = User::withTrashed()->withoutGlobalScopes()->find($user->id);
    expect($user->name)->toBe('Erased customer')
        ->and($user->email)->toBe("erased-{$user->id}@erased.invalid")
        ->and($user->phone)->toBeNull()
        ->and($user->is_active)->toBeFalse()
        ->and($user->trashed())->toBeTrue()
        ->and($user->tokens()->count())->toBe(0);

    $customer = Customer::withTrashed()->withoutGlobalScopes()->find($customer->id);
    expect($customer->company_name)->toBeNull()->and($customer->phone)->toBeNull()->and($customer->external_id)->toBeNull()->and($customer->trashed())->toBeTrue();

    $ticket = Ticket::withTrashed()->withoutGlobalScopes()->find($ticket->id);
    expect($ticket->subject)->toBe('[Removed] '.$ticket->ticket_number)
        ->and($ticket->description)->toBe(CustomerDataService::REDACTED_TEXT)
        ->and($ticket->messages()->withTrashed()->pluck('body')->unique()->all())->toBe([CustomerDataService::REDACTED_TEXT]);

    expect(TicketAttachment::withTrashed()->withoutGlobalScopes()->count())->toBe(0)
        ->and(Storage::disk($disk)->exists($path))->toBeFalse();

    $inbound = InboundEmail::withoutGlobalScopes()->first();
    expect($inbound->from_email)->toBe('erased@erased.invalid')->and($inbound->from_name)->toBeNull()->and($inbound->subject)->toBeNull();

    expect(AuditLog::where('action', 'ticket.created')->first()->new_values)->toBeNull()
        ->and(AuditLog::where('action', 'auth.login')->first()->new_values)->toBeNull()
        ->and(AuditLog::where('action', 'auth.login')->first()->ip_address)->toBeNull();

    $entry = AuditLog::where('action', 'customer.erased')->first();
    expect($entry->actor_id)->toBe($admin->id)
        ->and(json_encode($entry->new_values))->not->toContain('jamie')->toContain('"customer_id"');
});

it('can keep the ticket text and only anonymize the person', function () {
    [$customer, , $ticket] = customerWithHistory();
    $admin = actingAsAdministrator($this->tenant);

    $this->actingAs($admin, 'api')->postJson("/api/v1/customers/{$customer->id}/erase", ['confirm_email' => 'jamie@example.com', 'redact_content' => false])
        ->assertOk()->assertJsonPath('data.redacted_content', false)->assertJsonPath('data.messages_redacted', 0);

    $ticket = Ticket::withTrashed()->withoutGlobalScopes()->find($ticket->id);
    expect($ticket->subject)->toBe('My card was charged twice')
        ->and(TicketAttachment::withoutGlobalScopes()->count())->toBe(1)
        ->and(User::withTrashed()->withoutGlobalScopes()->where('email', 'jamie@example.com')->exists())->toBeFalse();
});

it('leaves other customers untouched, and the erased person can no longer sign in', function () {
    [$customer, $user] = customerWithHistory();
    $bystander = Customer::factory()->create(['tenant_id' => $this->tenant->id]);
    $bystanderTicket = Ticket::factory()->create(['tenant_id' => $this->tenant->id, 'customer_id' => $bystander->id, 'subject' => 'Unrelated']);
    $admin = actingAsAdministrator($this->tenant);

    $this->actingAs($admin, 'api')->postJson("/api/v1/customers/{$customer->id}/erase", ['confirm_email' => 'jamie@example.com'])->assertOk();

    expect($bystanderTicket->fresh()->subject)->toBe('Unrelated')->and($bystander->fresh()->user->is_active)->toBeTrue();
    $this->postJson('/api/v1/auth/login', ['email' => 'jamie@example.com', 'password' => 'password', 'tenant' => $this->tenant->slug])->assertStatus(422);
});

it('frees the email address so the same person can come back as a new customer', function () {
    [$customer] = customerWithHistory();
    $admin = actingAsAdministrator($this->tenant);
    $this->actingAs($admin, 'api')->postJson("/api/v1/customers/{$customer->id}/erase", ['confirm_email' => 'jamie@example.com'])->assertOk();

    $this->actingAs($admin, 'api')->postJson('/api/v1/customers', [
        'name' => 'Jamie Rivera', 'email' => 'jamie@example.com', 'password' => 'Str0ng!Passw0rd#1', 'password_confirmation' => 'Str0ng!Passw0rd#1',
    ])->assertCreated();
});

// ---- CSV exports ----------------------------------------------------------------------------

it('exports tickets as CSV with the customer, status and tags', function () {
    [, , $ticket] = customerWithHistory();
    $admin = actingAsAdministrator($this->tenant);
    $tag = \App\Models\TicketTag::create(['name' => 'refund', 'slug' => 'refund']);
    $ticket->tags()->attach($tag->id);

    $response = $this->actingAs($admin, 'api')->get('/api/v1/exports/tickets')->assertOk();
    $csv = $response->streamedContent();
    $lines = array_map('str_getcsv', array_filter(explode("\n", ltrim($csv, "\xEF\xBB\xBF"))));

    expect($response->headers->get('content-type'))->toContain('text/csv')
        ->and($lines[0])->toBe(['ticket_number', 'subject', 'status', 'priority', 'category', 'department', 'assignee', 'customer_name', 'customer_email', 'tags', 'created_at', 'first_response_at', 'resolved_at', 'closed_at'])
        ->and($lines[1][0])->toBe($ticket->ticket_number)
        ->and($lines[1][1])->toBe('My card was charged twice')
        ->and($lines[1][7])->toBe('Jamie Rivera')
        ->and($lines[1][8])->toBe('jamie@example.com')
        ->and($lines[1][9])->toBe('refund');
});

it('stops a ticket subject from running as a spreadsheet formula', function () {
    $admin = actingAsAdministrator($this->tenant);
    Ticket::factory()->create(['tenant_id' => $this->tenant->id, 'subject' => '=HYPERLINK("http://evil.test","click")']);
    Ticket::factory()->create(['tenant_id' => $this->tenant->id, 'subject' => '@SUM(1+1)']);

    $csv = $this->actingAs($admin, 'api')->get('/api/v1/exports/tickets')->assertOk()->streamedContent();

    expect($csv)->toContain("'=HYPERLINK")->toContain("'@SUM")->not->toContain(',=HYPERLINK')->not->toContain(',"=HYPERLINK');
});

it('filters the ticket export by creation date', function () {
    $admin = actingAsAdministrator($this->tenant);
    Ticket::factory()->create(['tenant_id' => $this->tenant->id, 'subject' => 'Old one', 'created_at' => '2026-01-10 10:00:00']);
    Ticket::factory()->create(['tenant_id' => $this->tenant->id, 'subject' => 'New one', 'created_at' => '2026-09-10 10:00:00']);

    $csv = $this->actingAs($admin, 'api')->get('/api/v1/exports/tickets?from=2026-06-01&to=2026-09-10')->assertOk()->streamedContent();

    expect($csv)->toContain('New one')->not->toContain('Old one');
});

it('only exports the tickets a department manager is allowed to see', function () {
    $manager = app(TenantContext::class)->runAs($this->tenant, function () {
        $user = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $user->assignRole('Department Manager');

        return $user;
    });
    $mine = \App\Models\Department::factory()->create(['tenant_id' => $this->tenant->id]);
    $theirs = \App\Models\Department::factory()->create(['tenant_id' => $this->tenant->id]);
    $manager->departments()->attach($mine->id);
    Ticket::factory()->create(['tenant_id' => $this->tenant->id, 'subject' => 'In my department', 'department_id' => $mine->id]);
    Ticket::factory()->create(['tenant_id' => $this->tenant->id, 'subject' => 'Another department', 'department_id' => $theirs->id]);

    $csv = $this->actingAs($manager, 'api')->get('/api/v1/exports/tickets')->assertOk()->streamedContent();

    expect($csv)->toContain('In my department')->not->toContain('Another department');
});

it('refuses the ticket export to customers and to agents without report access', function () {
    $customer = actingAsCustomer($this->tenant);
    $agent = actingAsAgent($this->tenant);

    $this->actingAs($customer, 'api')->get('/api/v1/exports/tickets')->assertForbidden();
    $this->actingAs($agent, 'api')->get('/api/v1/exports/tickets')->assertForbidden();
    $this->actingAs($customer, 'api')->get('/api/v1/exports/customers')->assertForbidden();
});

it('exports customers as CSV', function () {
    customerWithHistory();
    $admin = actingAsAdministrator($this->tenant);

    $csv = $this->actingAs($admin, 'api')->get('/api/v1/exports/customers')->assertOk()->streamedContent();

    expect($csv)->toContain('name,email,phone,company_name,customer_type,external_id,created_at')
        ->toContain('Jamie Rivera')->toContain('jamie@example.com')->toContain('wp-user-9');
});
