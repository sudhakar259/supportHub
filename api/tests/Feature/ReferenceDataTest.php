<?php

use App\Models\Customer;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\TicketPrioritySeeder;
use Database\Seeders\TicketStatusSeeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->seed([
        RolesAndPermissionsSeeder::class,
        TicketStatusSeeder::class,
        TicketPrioritySeeder::class,
    ]);
});

it('lets an admin manage categories including subcategories', function () {
    $admin = actingAsAdministrator();

    $parent = $this->actingAs($admin, 'api')
        ->postJson('/api/v1/categories', ['name' => 'Billing', 'slug' => 'billing'])
        ->assertCreated()
        ->json('data');

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/categories', [
            'name' => 'Refund Request',
            'slug' => 'refund-request',
            'parent_id' => $parent['id'],
        ])->assertCreated();

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/categories')
        ->assertOk()
        ->assertJsonPath('data.0.name', 'Billing')
        ->assertJsonCount(1, 'data.0.children');
});

it('prevents a category from being its own parent', function () {
    $admin = actingAsAdministrator();
    $category = TicketCategory::factory()->create();

    $this->actingAs($admin, 'api')
        ->putJson("/api/v1/categories/{$category->id}", ['parent_id' => $category->id])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['parent_id']);
});

it('refuses to delete a status that is in use by a ticket', function () {
    $admin = actingAsAdministrator();
    $status = TicketStatus::where('slug', 'open')->firstOrFail();

    // A ticket factory belongs to a later phase; simulate usage directly.
    DB::table('tickets')->insert([
        'id' => (string) Str::ulid(),
        'ticket_number' => 'TKT-TEST-1',
        'customer_id' => Customer::factory()->create()->id,
        'subject' => 'Test',
        'description' => 'Test',
        'priority_id' => TicketPriority::first()->id,
        'status_id' => $status->id,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $this->actingAs($admin, 'api')
        ->deleteJson("/api/v1/statuses/{$status->id}")
        ->assertStatus(422)
        ->assertJsonPath('success', false);
});

it('lets an admin create and delete a priority', function () {
    $admin = actingAsAdministrator();

    $response = $this->actingAs($admin, 'api')
        ->postJson('/api/v1/priorities', [
            'name' => 'Critical',
            'slug' => 'critical',
            'level' => 5,
        ])->assertCreated();

    $id = $response->json('data.id');

    $this->actingAs($admin, 'api')
        ->deleteJson("/api/v1/priorities/{$id}")
        ->assertOk();

    $this->assertDatabaseMissing('ticket_priorities', ['id' => $id]);
});

it('forbids a customer from managing categories', function () {
    $customer = actingAsCustomer();

    $this->actingAs($customer, 'api')
        ->postJson('/api/v1/categories', ['name' => 'X', 'slug' => 'x'])
        ->assertStatus(403);
});
