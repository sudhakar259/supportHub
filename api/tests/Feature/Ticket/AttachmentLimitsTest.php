<?php

use App\Models\Customer;
use App\Models\Ticket;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake();
    testTenant();
});

function ticketOwnedBy($user): Ticket
{
    $customer = Customer::factory()->create(['user_id' => $user->id, 'tenant_id' => $user->tenant_id]);

    return Ticket::factory()->create(['tenant_id' => $user->tenant_id, 'customer_id' => $customer->id]);
}

dataset('allowed files', [
    'jpg' => ['photo.jpg', 'image/jpeg'],
    'jpeg' => ['photo.jpeg', 'image/jpeg'],
    'png' => ['photo.png', 'image/png'],
    'webp' => ['photo.webp', 'image/webp'],
    'txt' => ['notes.txt', 'text/plain'],
    'pdf' => ['report.pdf', 'application/pdf'],
    'docx' => ['letter.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    'pptx' => ['deck.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    'ppt' => ['deck.ppt', 'application/vnd.ms-powerpoint'],
]);

dataset('rejected files', [
    'gif' => ['anim.gif', 'image/gif'],
    'zip' => ['bundle.zip', 'application/zip'],
    'xlsx' => ['sheet.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    'exe' => ['run.exe', 'application/x-msdownload'],
]);

it('lets a customer attach each allowed file type', function (string $name, string $mime) {
    $customer = actingAsCustomer();
    $ticket = ticketOwnedBy($customer);

    $this->actingAs($customer, 'api')
        ->post("/api/v1/tickets/{$ticket->id}/attachments", ['file' => UploadedFile::fake()->create($name, 100, $mime)], ['Accept' => 'application/json'])
        ->assertCreated();
})->with('allowed files');

it('lets a support executive attach each allowed file type', function (string $name, string $mime) {
    $agent = actingAsAgent();
    $ticket = Ticket::factory()->create(['tenant_id' => $agent->tenant_id, 'assignee_id' => $agent->id]);

    $this->actingAs($agent, 'api')
        ->post("/api/v1/tickets/{$ticket->id}/attachments", ['file' => UploadedFile::fake()->create($name, 100, $mime)], ['Accept' => 'application/json'])
        ->assertCreated();
})->with('allowed files');

it('rejects file types outside the allow-list', function (string $name, string $mime) {
    $customer = actingAsCustomer();
    $ticket = ticketOwnedBy($customer);

    $this->actingAs($customer, 'api')
        ->post("/api/v1/tickets/{$ticket->id}/attachments", ['file' => UploadedFile::fake()->create($name, 100, $mime)], ['Accept' => 'application/json'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['file']);
})->with('rejected files');

it('accepts a file of exactly 2 MB and rejects anything larger', function () {
    $customer = actingAsCustomer();
    $ticket = ticketOwnedBy($customer);
    $url = "/api/v1/tickets/{$ticket->id}/attachments";

    $this->actingAs($customer, 'api')
        ->post($url, ['file' => UploadedFile::fake()->create('ok.pdf', 2048, 'application/pdf')], ['Accept' => 'application/json'])
        ->assertCreated();

    $this->actingAs($customer, 'api')
        ->post($url, ['file' => UploadedFile::fake()->create('big.pdf', 2049, 'application/pdf')], ['Accept' => 'application/json'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['file']);
});

it('applies the same limits to attachments sent with a message', function () {
    $customer = actingAsCustomer();
    $ticket = ticketOwnedBy($customer);
    $url = "/api/v1/tickets/{$ticket->id}/messages";

    $this->actingAs($customer, 'api')
        ->post($url, ['body' => 'see attached', 'attachments' => [UploadedFile::fake()->create('big.png', 3000, 'image/png')]], ['Accept' => 'application/json'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['attachments.0']);

    $this->actingAs($customer, 'api')
        ->post($url, ['body' => 'see attached', 'attachments' => [UploadedFile::fake()->create('ok.webp', 500, 'image/webp')]], ['Accept' => 'application/json'])
        ->assertCreated();
});

it('applies the same limits through the integration API', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['tickets.attachments']);
    $ticket = Ticket::factory()->create(['tenant_id' => $tenant->id]);
    $url = "/api/v1/integration/tickets/{$ticket->id}/attachments";

    withIntegrationAuth($this, $pair)
        ->post($url, ['file' => UploadedFile::fake()->create('deck.pptx', 500, 'application/vnd.openxmlformats-officedocument.presentationml.presentation')], ['Accept' => 'application/json'])
        ->assertCreated();

    withIntegrationAuth($this, $pair)
        ->post($url, ['file' => UploadedFile::fake()->create('big.pdf', 3000, 'application/pdf')], ['Accept' => 'application/json'])
        ->assertStatus(422);

    withIntegrationAuth($this, $pair)
        ->post($url, ['file' => UploadedFile::fake()->create('bundle.zip', 100, 'application/zip')], ['Accept' => 'application/json'])
        ->assertStatus(422);
});

it('lets a customer attach files to a reply through the integration API', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['tickets.reply', 'tickets.attachments', 'tickets.read']);
    $ticket = Ticket::factory()->create(['tenant_id' => $tenant->id]);

    $response = withIntegrationAuth($this, $pair)
        ->post("/api/v1/integration/tickets/{$ticket->id}/messages", [
            'body' => 'Screenshot attached',
            'attachments' => [
                UploadedFile::fake()->create('error.png', 300, 'image/png'),
                UploadedFile::fake()->create('log.txt', 10, 'text/plain'),
            ],
        ], ['Accept' => 'application/json'])
        ->assertCreated();

    expect($response->json('data.attachments'))->toHaveCount(2);

    // The thread shows the files against that reply.
    $thread = withIntegrationAuth($this, $pair)->getJson("/api/v1/integration/tickets/{$ticket->id}/messages")->assertOk()->json('data');
    expect(collect($thread)->last()['attachments'])->toHaveCount(2);
});

it('rejects a bad file on an integration reply without posting the reply', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['tickets.reply', 'tickets.attachments']);
    $ticket = Ticket::factory()->create(['tenant_id' => $tenant->id]);

    withIntegrationAuth($this, $pair)
        ->post("/api/v1/integration/tickets/{$ticket->id}/messages", [
            'body' => 'with a big file',
            'attachments' => [UploadedFile::fake()->create('huge.pdf', 5000, 'application/pdf')],
        ], ['Accept' => 'application/json'])
        ->assertStatus(422);

    expect($ticket->messages()->count())->toBe(0);
});

it('needs the tickets.attachments scope as well to send files on a reply', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['tickets.reply']);
    $ticket = Ticket::factory()->create(['tenant_id' => $tenant->id]);

    withIntegrationAuth($this, $pair)
        ->post("/api/v1/integration/tickets/{$ticket->id}/messages", [
            'body' => 'no scope for files',
            'attachments' => [UploadedFile::fake()->create('a.png', 10, 'image/png')],
        ], ['Accept' => 'application/json'])
        ->assertStatus(403);

    expect($ticket->messages()->count())->toBe(0);

    // A text-only reply still works with tickets.reply alone.
    withIntegrationAuth($this, $pair)
        ->postJson("/api/v1/integration/tickets/{$ticket->id}/messages", ['body' => 'just text'])
        ->assertCreated();
});

it('attaches files when a ticket is created through the integration API and returns them on the ticket', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['tickets.create', 'tickets.attachments', 'tickets.read']);
    $customer = Customer::factory()->create(['tenant_id' => $tenant->id]);

    $response = withIntegrationAuth($this, $pair)
        ->post('/api/v1/integration/tickets', [
            'subject' => 'Checkout is down',
            'description' => 'See screenshot.',
            'customer_id' => $customer->id,
            'attachments' => [UploadedFile::fake()->create('error.png', 300, 'image/png')],
        ], ['Accept' => 'application/json'])
        ->assertCreated();

    expect($response->json('data.attachments'))->toHaveCount(1)
        ->and($response->json('data.attachments.0.original_filename'))->toBe('error.png');

    $ticketId = $response->json('data.id');
    withIntegrationAuth($this, $pair)->getJson("/api/v1/integration/tickets/{$ticketId}")
        ->assertOk()->assertJsonCount(1, 'data.attachments');
});

it('shows ticket-level attachments to staff on the ticket, separate from reply attachments', function () {
    $admin = actingAsAdministrator();
    $ticket = Ticket::factory()->create(['tenant_id' => $admin->tenant_id]);

    $this->actingAs($admin, 'api')
        ->post("/api/v1/tickets/{$ticket->id}/attachments", ['file' => UploadedFile::fake()->create('first.pdf', 100, 'application/pdf')], ['Accept' => 'application/json'])
        ->assertCreated();
    $this->actingAs($admin, 'api')
        ->post("/api/v1/tickets/{$ticket->id}/messages", ['body' => 'reply', 'attachments' => [UploadedFile::fake()->create('onreply.png', 100, 'image/png')]], ['Accept' => 'application/json'])
        ->assertCreated();

    $this->actingAs($admin, 'api')->getJson("/api/v1/tickets/{$ticket->id}")
        ->assertOk()
        ->assertJsonCount(1, 'data.attachments')
        ->assertJsonPath('data.attachments.0.original_filename', 'first.pdf');
});

it('refuses files on integration ticket create without the tickets.attachments scope', function () {
    $tenant = testTenant();
    $pair = createIntegrationCredential($tenant, ['tickets.create']);
    $customer = Customer::factory()->create(['tenant_id' => $tenant->id]);

    withIntegrationAuth($this, $pair)
        ->post('/api/v1/integration/tickets', [
            'subject' => 's', 'description' => 'd', 'customer_id' => $customer->id,
            'attachments' => [UploadedFile::fake()->create('a.png', 10, 'image/png')],
        ], ['Accept' => 'application/json'])
        ->assertStatus(403);

    expect(Ticket::where('subject', 's')->exists())->toBeFalse();
});

it('lets the ticket owner download an uploaded attachment with their token, and nobody else', function () {
    $customer = actingAsCustomer();
    $ticket = ticketOwnedBy($customer);

    $upload = $this->actingAs($customer, 'api')
        ->post("/api/v1/tickets/{$ticket->id}/attachments", ['file' => UploadedFile::fake()->createWithContent('notes.txt', 'hello world')], ['Accept' => 'application/json'])
        ->assertCreated();
    $id = $upload->json('data.id');

    $token = $customer->createToken('web-browser')->plainTextToken;
    $this->app['auth']->forgetGuards();
    $this->withToken($token)->get("/api/v1/tickets/{$ticket->id}/attachments/{$id}/download")
        ->assertOk()
        ->assertHeader('content-disposition');

    // Another customer in the same tenant cannot.
    $other = actingAsCustomer();
    $this->app['auth']->forgetGuards();
    $this->actingAs($other, 'api')->get("/api/v1/tickets/{$ticket->id}/attachments/{$id}/download")->assertForbidden();
});
