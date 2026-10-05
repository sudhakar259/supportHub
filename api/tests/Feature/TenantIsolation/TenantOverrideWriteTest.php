<?php

use App\Models\NotificationTemplate;
use App\Models\SystemSetting;
use App\Models\Tenant;
use App\Services\TenantProvisioningService;
use App\Support\TenantContext;
use Database\Seeders\NotificationTemplateSeeder;
use Database\Seeders\SystemSettingSeeder;

/*
|--------------------------------------------------------------------------
| Platform-default / tenant-override write isolation
|--------------------------------------------------------------------------
|
| NotificationTemplate and SystemSetting use TenantOverlayScope, not
| TenantScope: a tenant sees the platform default for any key it
| hasn't customized yet. Reading that shared row is fine — the bug
| this file guards against is WRITING to it. Before the fix, "editing"
| a not-yet-overridden template/setting mutated the platform-default
| row in place, which every other tenant was also silently falling
| back to. The expected behavior is copy-on-write: the first edit
| forks a tenant-owned row and leaves the shared default untouched.
*/

beforeEach(function () {
    testTenant();
    $this->seed([
        NotificationTemplateSeeder::class,
        SystemSettingSeeder::class,
    ]);
});

function otherProvisionedTenantForOverrides(): Tenant
{
    $tenant = Tenant::create(['name' => 'Umbrella Corp', 'slug' => 'umbrella-'.uniqid(), 'status' => 'active']);
    app(TenantProvisioningService::class)->provision($tenant);

    return $tenant;
}

it('forks a tenant-owned override on first edit instead of mutating the platform default notification template', function () {
    $tenantB = otherProvisionedTenantForOverrides();
    $adminA = actingAsAdministrator();

    $platformDefault = app(TenantContext::class)->runAs(null, fn () => NotificationTemplate::where('key', 'ticket_created')->whereNull('tenant_id')->firstOrFail());

    $this->actingAs($adminA, 'api')
        ->putJson("/api/v1/notification-templates/{$platformDefault->id}", ['subject' => 'Tenant A custom subject'])
        ->assertOk()
        ->assertJsonPath('data.subject', 'Tenant A custom subject');

    // The platform default itself must be untouched.
    $platformDefault->refresh();
    expect($platformDefault->subject)->not->toBe('Tenant A custom subject');

    // Tenant B, who never edited anything, must still see the original.
    $tenantBSubject = app(TenantContext::class)->runAs($tenantB, fn () => NotificationTemplate::where('key', 'ticket_created')->first()->subject);
    expect($tenantBSubject)->not->toBe('Tenant A custom subject');

    // Tenant A must now have exactly one override row for this key.
    $overrideCount = app(TenantContext::class)->runAs($adminA->tenant, fn () => NotificationTemplate::where('key', 'ticket_created')->where('tenant_id', $adminA->tenant_id)->count());
    expect($overrideCount)->toBe(1);
});

it('forks a tenant-owned override on first edit instead of mutating the platform default setting', function () {
    $tenantB = otherProvisionedTenantForOverrides();
    $adminA = actingAsAdministrator();

    $this->actingAs($adminA, 'api')
        ->putJson('/api/v1/settings', [
            'settings' => [['key' => 'support_hours_message', 'value' => 'Tenant A hours only']],
        ])
        ->assertOk()
        ->assertJsonFragment(['value' => 'Tenant A hours only']);

    $platformDefault = app(TenantContext::class)->runAs(null, fn () => SystemSetting::where('key', 'support_hours_message')->whereNull('tenant_id')->firstOrFail());
    expect($platformDefault->value)->not->toBe('Tenant A hours only');

    $tenantBValue = app(TenantContext::class)->runAs($tenantB, fn () => SystemSetting::get('support_hours_message'));
    expect($tenantBValue)->not->toBe('Tenant A hours only');

    $tenantAValue = app(TenantContext::class)->runAs($adminA->tenant, fn () => SystemSetting::get('support_hours_message'));
    expect($tenantAValue)->toBe('Tenant A hours only');
});
