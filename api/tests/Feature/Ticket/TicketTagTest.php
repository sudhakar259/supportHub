<?php

use App\Models\Customer;
use App\Models\Tenant;
use App\Models\Ticket;
use App\Models\TicketTag;
use App\Services\TenantProvisioningService;
use App\Support\TenantContext;

beforeEach(fn () => testTenant());

it('lets an agent set tags on a ticket, creating the ones that do not exist yet', function () {
    $agent = actingAsAgent();
    $ticket = Ticket::factory()->create(['assignee_id' => $agent->id]);

    $this->actingAs($agent, 'api')->putJson("/api/v1/tickets/{$ticket->id}/tags", ['tags' => ['VIP', 'refund']])
        ->assertOk()->assertJsonPath('data', ['refund', 'vip']);

    expect(TicketTag::count())->toBe(2)->and($ticket->tags()->count())->toBe(2);

    $this->actingAs($agent, 'api')->getJson("/api/v1/tickets/{$ticket->id}")
        ->assertOk()->assertJsonPath('data.tags', ['refund', 'vip']);
});

it('replaces the previous tags, reuses existing ones and can clear them all', function () {
    $agent = actingAsAgent();
    $ticket = Ticket::factory()->create(['assignee_id' => $agent->id]);
    $url = "/api/v1/tickets/{$ticket->id}/tags";

    $this->actingAs($agent, 'api')->putJson($url, ['tags' => ['vip', 'bug']])->assertOk();
    $this->actingAs($agent, 'api')->putJson($url, ['tags' => ['bug']])->assertOk()->assertJsonPath('data', ['bug']);
    expect(TicketTag::count())->toBe(2); // "vip" stays in the workspace list, just not on this ticket

    $this->actingAs($agent, 'api')->putJson($url, ['tags' => []])->assertOk()->assertJsonPath('data', []);
    expect($ticket->tags()->count())->toBe(0);
});

it('normalizes names: trims, lower-cases and drops duplicates and blanks', function () {
    $agent = actingAsAgent();
    $ticket = Ticket::factory()->create(['assignee_id' => $agent->id]);

    $this->actingAs($agent, 'api')->putJson("/api/v1/tickets/{$ticket->id}/tags", ['tags' => ['  Billing  ', 'billing', 'BILLING', '   ', 'a  b']])
        ->assertOk()->assertJsonPath('data', ['a b', 'billing']);
});

it('rejects too many or too long tags', function () {
    $agent = actingAsAgent();
    $ticket = Ticket::factory()->create(['assignee_id' => $agent->id]);
    $url = "/api/v1/tickets/{$ticket->id}/tags";

    $this->actingAs($agent, 'api')->putJson($url, ['tags' => array_map(fn ($i) => "tag{$i}", range(1, 11))])->assertStatus(422);
    $this->actingAs($agent, 'api')->putJson($url, ['tags' => [str_repeat('x', 31)]])->assertStatus(422);
    $this->actingAs($agent, 'api')->putJson($url, [])->assertStatus(422);
});

it('keeps tags away from customers: they cannot set, list or see them', function () {
    $agent = actingAsAgent();
    $customerUser = actingAsCustomer();
    $customer = Customer::factory()->create(['user_id' => $customerUser->id, 'tenant_id' => $customerUser->tenant_id]);
    $ticket = Ticket::factory()->create(['customer_id' => $customer->id, 'assignee_id' => $agent->id]);
    $this->actingAs($agent, 'api')->putJson("/api/v1/tickets/{$ticket->id}/tags", ['tags' => ['angry-customer']])->assertOk();

    $this->actingAs($customerUser, 'api')->putJson("/api/v1/tickets/{$ticket->id}/tags", ['tags' => ['x']])->assertForbidden();
    $this->actingAs($customerUser, 'api')->getJson('/api/v1/ticket-tags')->assertForbidden();

    $show = $this->actingAs($customerUser, 'api')->getJson("/api/v1/tickets/{$ticket->id}")->assertOk();
    expect($show->json('data'))->not->toHaveKey('tags');
    $list = $this->actingAs($customerUser, 'api')->getJson('/api/v1/tickets')->assertOk();
    expect($list->getContent())->not->toContain('angry-customer');
});

it('lists the workspace tags and filters tickets by tag', function () {
    $agent = actingAsAgent();
    $tagged = Ticket::factory()->create(['assignee_id' => $agent->id]);
    $other = Ticket::factory()->create(['assignee_id' => $agent->id]);
    $this->actingAs($agent, 'api')->putJson("/api/v1/tickets/{$tagged->id}/tags", ['tags' => ['vip']])->assertOk();

    $this->actingAs($agent, 'api')->getJson('/api/v1/ticket-tags')->assertOk()->assertJsonPath('data.0.slug', 'vip');

    $ids = collect($this->actingAs($agent, 'api')->getJson('/api/v1/tickets?filter[tag]=vip')->assertOk()->json('data'))->pluck('id');
    expect($ids->all())->toBe([$tagged->id])->and($ids)->not->toContain($other->id);
});

it('lets two workspaces use the same tag name without clashing', function () {
    $agentA = actingAsAgent();
    $ticketA = Ticket::factory()->create(['assignee_id' => $agentA->id]);
    $this->actingAs($agentA, 'api')->putJson("/api/v1/tickets/{$ticketA->id}/tags", ['tags' => ['vip']])->assertOk();

    $other = Tenant::create(['name' => 'Other Org', 'slug' => 'other-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($other);
    [$agentB, $ticketB] = app(TenantContext::class)->runAs($other, function () use ($other) {
        $agent = actingAsAgent($other);

        return [$agent, Ticket::factory()->create(['tenant_id' => $other->id, 'assignee_id' => $agent->id])];
    });

    $this->actingAs($agentB, 'api')->putJson("/api/v1/tickets/{$ticketB->id}/tags", ['tags' => ['vip']])->assertOk()->assertJsonPath('data', ['vip']);

    expect(TicketTag::withoutGlobalScopes()->where('slug', 'vip')->count())->toBe(2);
});

it('records a tag change in the ticket activity', function () {
    $agent = actingAsAgent();
    $ticket = Ticket::factory()->create(['assignee_id' => $agent->id]);

    $this->actingAs($agent, 'api')->putJson("/api/v1/tickets/{$ticket->id}/tags", ['tags' => ['vip']])->assertOk();

    expect($ticket->activities()->where('type', 'tags_changed')->exists())->toBeTrue();
});
