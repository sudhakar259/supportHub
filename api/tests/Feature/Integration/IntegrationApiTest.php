<?php

use App\Models\ApiCredential;
use App\Models\Customer;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Services\TenantProvisioningService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\TicketNumberSettingSeeder;
use Database\Seeders\TicketPrioritySeeder;
use Database\Seeders\TicketStatusSeeder;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->seed([
        RolesAndPermissionsSeeder::class,
        TicketStatusSeeder::class,
        TicketPrioritySeeder::class,
        TicketNumberSettingSeeder::class,
    ]);
});

/**
 * Creates an active credential for the given tenant and returns both
 * the model and the plain-text secret (never recoverable afterward),
 * so the test can authenticate as it via headers.
 */
function createIntegrationCredential(Tenant $tenant, array $scopes = ApiCredential::ALL_SCOPES): array
{
    $pair = ApiCredential::generateCredentialPair();

    $credential = ApiCredential::create([
        'tenant_id' => $tenant->id,
        'name' => 'Test Integration',
        'key' => $pair['key'],
        'secret_hash' => Hash::make($pair['secret']),
        'secret_last_four' => substr($pair['secret'], -4),
        'scopes' => $scopes,
        'status' => 'active',
    ]);

    return ['credential' => $credential, 'key' => $pair['key'], 'secret' => $pair['secret']];
}

function withIntegrationAuth($testCase, array $pair)
{
    return $testCase->withHeaders(['X-Api-Key' => $pair['key'], 'X-Api-Secret' => $pair['secret']]);
}

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
