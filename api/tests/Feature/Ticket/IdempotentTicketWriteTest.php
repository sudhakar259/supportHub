<?php

use App\Actions\Ticket\CreateTicketAction;
use App\Models\Customer;
use App\Models\Ticket;
use App\Models\TicketMessage;
use Database\Seeders\NotificationTemplateSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    testTenant();
    $this->seed(NotificationTemplateSeeder::class);
});

function ticketPayload(string $subject = 'Cannot sign in'): array
{
    return ['subject' => $subject, 'description' => 'Getting an error on the login page.'];
}

it('returns the stored response for a retried ticket create with the same key', function () {
    $customer = Customer::factory()->create();
    $headers = ['Idempotency-Key' => 'create-1'];

    $first = $this->actingAs($customer->user, 'api')
        ->withHeaders($headers)
        ->postJson('/api/v1/tickets', ticketPayload())
        ->assertCreated();

    $retry = $this->actingAs($customer->user, 'api')
        ->withHeaders($headers)
        ->postJson('/api/v1/tickets', ticketPayload())
        ->assertCreated()
        ->assertHeader('Idempotent-Replayed', 'true');

    expect($retry->json('data.id'))->toBe($first->json('data.id'));
    expect(Ticket::count())->toBe(1);
});

it('creates a new ticket for each request without an Idempotency-Key', function () {
    $customer = Customer::factory()->create();

    $this->actingAs($customer->user, 'api')->postJson('/api/v1/tickets', ticketPayload())->assertCreated();
    $this->actingAs($customer->user, 'api')->postJson('/api/v1/tickets', ticketPayload())->assertCreated();

    expect(Ticket::count())->toBe(2);
});

it('rejects a reused key sent with a different body', function () {
    $customer = Customer::factory()->create();
    $headers = ['Idempotency-Key' => 'create-2'];

    $this->actingAs($customer->user, 'api')
        ->withHeaders($headers)
        ->postJson('/api/v1/tickets', ticketPayload('First subject'))
        ->assertCreated();

    $this->actingAs($customer->user, 'api')
        ->withHeaders($headers)
        ->postJson('/api/v1/tickets', ticketPayload('Different subject'))
        ->assertStatus(422)
        ->assertJsonPath('message', 'This Idempotency-Key was already used for a different request.');

    expect(Ticket::count())->toBe(1);
});

it('scopes keys to the caller, so two customers can use the same key', function () {
    $first = Customer::factory()->create();
    $second = Customer::factory()->create();

    $this->actingAs($first->user, 'api')
        ->withHeaders(['Idempotency-Key' => 'shared'])
        ->postJson('/api/v1/tickets', ticketPayload())
        ->assertCreated();

    $this->actingAs($second->user, 'api')
        ->withHeaders(['Idempotency-Key' => 'shared'])
        ->postJson('/api/v1/tickets', ticketPayload())
        ->assertCreated();

    expect(Ticket::count())->toBe(2);
});

it('answers 409 while the first attempt with the key is still running', function () {
    $customer = Customer::factory()->create();
    $payload = ticketPayload();
    $hash = hash('sha256', 'POST api/v1/tickets '.json_encode(['description' => $payload['description'], 'subject' => $payload['subject']], JSON_UNESCAPED_SLASHES));

    DB::table('idempotency_keys')->insert([
        'tenant_id' => testTenant()->id,
        'scope' => 'user:'.$customer->user->id,
        'key' => 'in-flight',
        'request_hash' => $hash,
        'status_code' => null,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($customer->user, 'api')
        ->withHeaders(['Idempotency-Key' => 'in-flight'])
        ->postJson('/api/v1/tickets', $payload)
        ->assertStatus(409);

    expect(Ticket::count())->toBe(0);
});

it('releases the key when the write fails, so the retry can succeed', function () {
    $customer = Customer::factory()->create();
    $headers = ['Idempotency-Key' => 'retry-after-failure'];
    $real = $this->app->build(CreateTicketAction::class);
    $attempts = 0;

    $this->mock(CreateTicketAction::class, function ($mock) use ($real, &$attempts) {
        $mock->shouldReceive('execute')->andReturnUsing(function (...$args) use ($real, &$attempts) {
            if (++$attempts === 1) {
                throw new RuntimeException('database unavailable');
            }

            return $real->execute(...$args);
        });
    });

    $this->actingAs($customer->user, 'api')
        ->withHeaders($headers)
        ->postJson('/api/v1/tickets', ticketPayload())
        ->assertStatus(500);

    $this->actingAs($customer->user, 'api')
        ->withHeaders($headers)
        ->postJson('/api/v1/tickets', ticketPayload())
        ->assertCreated();

    expect(Ticket::count())->toBe(1);
});

it('replays a retried reply without posting it twice', function () {
    $customer = Customer::factory()->create();
    $ticketId = $this->actingAs($customer->user, 'api')
        ->postJson('/api/v1/tickets', ticketPayload())
        ->assertCreated()
        ->json('data.id');

    $headers = ['Idempotency-Key' => 'reply-1'];

    $this->actingAs($customer->user, 'api')
        ->withHeaders($headers)
        ->postJson("/api/v1/tickets/{$ticketId}/messages", ['body' => 'Still broken after the restart.'])
        ->assertCreated();

    $this->actingAs($customer->user, 'api')
        ->withHeaders($headers)
        ->postJson("/api/v1/tickets/{$ticketId}/messages", ['body' => 'Still broken after the restart.'])
        ->assertCreated()
        ->assertHeader('Idempotent-Replayed', 'true');

    expect(TicketMessage::where('ticket_id', $ticketId)->where('body', 'Still broken after the restart.')->count())->toBe(1);
});

it('replays a retried integration ticket create with the same key', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant);
    $customer = Customer::factory()->create();
    $payload = [
        'subject' => 'Synced from chat widget',
        'description' => 'Customer asked about billing.',
        'customer_email' => $customer->user->email,
    ];
    $headers = ['Idempotency-Key' => 'chat-sync-1'];

    $first = withIntegrationAuth($this, $pair)
        ->withHeaders($headers)
        ->postJson('/api/v1/integration/tickets', $payload)
        ->assertCreated();

    $retry = withIntegrationAuth($this, $pair)
        ->withHeaders($headers)
        ->postJson('/api/v1/integration/tickets', $payload)
        ->assertCreated()
        ->assertHeader('Idempotent-Replayed', 'true');

    expect($retry->json('data.id'))->toBe($first->json('data.id'));
    expect(Ticket::where('subject', 'Synced from chat widget')->count())->toBe(1);
});
