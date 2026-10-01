<?php

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\NotificationPreference;
use App\Models\NotificationTemplate;
use App\Models\SystemSetting;
use App\Models\Ticket;
use Database\Seeders\NotificationTemplateSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Database\Seeders\TicketPrioritySeeder;
use Database\Seeders\TicketStatusSeeder;

beforeEach(function () {
    $this->seed([
        RolesAndPermissionsSeeder::class,
        TicketStatusSeeder::class,
        TicketPrioritySeeder::class,
        NotificationTemplateSeeder::class,
    ]);
});

it('lets a user view and update their own notification preferences', function () {
    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')
        ->getJson('/api/v1/notification-preferences')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    $this->actingAs($agent, 'api')
        ->putJson('/api/v1/notification-preferences', [
            'preferences' => [
                ['channel' => 'mail', 'event_key' => 'ticket_assigned', 'enabled' => false],
            ],
        ])->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.enabled', false);

    expect(NotificationPreference::where('user_id', $agent->id)->count())->toBe(1);
});

it('lets an admin edit notification template content', function () {
    $admin = actingAsAdministrator();
    $template = NotificationTemplate::where('key', 'ticket_created')->first();

    $this->actingAs($admin, 'api')
        ->putJson("/api/v1/notification-templates/{$template->id}", [
            'subject' => 'Updated subject {ticket_number}',
        ])->assertOk()
        ->assertJsonPath('data.subject', 'Updated subject {ticket_number}');
});

it('forbids a non-admin from editing notification templates', function () {
    $agent = actingAsAgent();
    $template = NotificationTemplate::first();

    $this->actingAs($agent, 'api')
        ->putJson("/api/v1/notification-templates/{$template->id}", ['subject' => 'Hacked'])
        ->assertStatus(403);
});

it('lets an admin view audit logs and filter by action', function () {
    $admin = actingAsAdministrator();
    AuditLog::create(['action' => 'ticket.created', 'actor_type' => 'user']);
    AuditLog::create(['action' => 'ticket.status_changed', 'actor_type' => 'user']);

    $response = $this->actingAs($admin, 'api')
        ->getJson('/api/v1/audit-logs?filter[action]=ticket.created')
        ->assertOk();

    expect($response->json('data'))->toHaveCount(1);
});

it('forbids an agent from viewing audit logs', function () {
    $agent = actingAsAgent();

    $this->actingAs($agent, 'api')
        ->getJson('/api/v1/audit-logs')
        ->assertStatus(403);
});

it('exposes only public settings to a non-privileged user, and all to an admin', function () {
    SystemSetting::create(['key' => 'public_one', 'value' => 'visible', 'is_public' => true]);
    SystemSetting::create(['key' => 'private_one', 'value' => 'hidden', 'is_public' => false]);

    $customer = Customer::factory()->create();
    $response = $this->actingAs($customer->user, 'api')->getJson('/api/v1/settings')->assertOk();
    expect($response->json('data'))->toHaveCount(1);

    $admin = actingAsAdministrator();
    $adminResponse = $this->actingAs($admin, 'api')->getJson('/api/v1/settings')->assertOk();
    expect($adminResponse->json('data'))->toHaveCount(2);
});

it('lets an admin update settings and forbids a non-admin from writing', function () {
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->putJson('/api/v1/settings', [
            'settings' => [['key' => 'max_attachment_mb', 'value' => '25', 'type' => 'integer']],
        ])->assertOk();

    $this->assertDatabaseHas('system_settings', ['key' => 'max_attachment_mb']);

    $agent = actingAsAgent();
    $this->actingAs($agent, 'api')
        ->putJson('/api/v1/settings', ['settings' => [['key' => 'x', 'value' => 'y']]])
        ->assertStatus(403);
});

it('returns a ticket summary report to a user with reports.view', function () {
    $admin = actingAsAdministrator();
    Ticket::factory()->count(2)->create();

    $response = $this->actingAs($admin, 'api')
        ->getJson('/api/v1/reports/tickets-summary')
        ->assertOk();

    expect($response->json('data.total_tickets'))->toBe(2);
});

it('forbids a customer from accessing reports', function () {
    $customer = Customer::factory()->create();

    $this->actingAs($customer->user, 'api')
        ->getJson('/api/v1/reports/sla-compliance')
        ->assertStatus(403);
});
