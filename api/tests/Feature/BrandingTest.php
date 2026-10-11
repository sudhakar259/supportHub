<?php

use App\Models\SystemSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\TicketEventNotification;
use App\Support\BrandPalette;

function brandedAdmin(): User
{
    return actingAsAdministrator();
}

it('derives readable shades from one brand colour', function () {
    $palette = BrandPalette::forPrimary('#0f766e');

    expect($palette['primary'])->toBe('#0f766e')
        ->and(BrandPalette::contrast($palette['primary'], '#ffffff'))->toBeGreaterThanOrEqual(4.5)
        ->and(BrandPalette::contrast($palette['inverse_primary'], '#213145'))->toBeGreaterThanOrEqual(4.5)
        ->and(BrandPalette::contrast($palette['on_primary_fixed_variant'], $palette['primary_fixed']))->toBeGreaterThanOrEqual(4.5);
});

it('accepts short and unprefixed hex colours', function () {
    expect(BrandPalette::normalize('0F7'))->toBe('#00ff77')
        ->and(BrandPalette::normalize('#A33900'))->toBe('#a33900')
        ->and(BrandPalette::normalize('orange'))->toBeNull();
});

it('lets an administrator set the brand colour and sends it to the app', function () {
    $admin = brandedAdmin();

    $this->actingAs($admin, 'api')->putJson('/api/v1/branding', ['primary_color' => '#0F766E'])
        ->assertOk()
        ->assertJsonPath('data.primary_color', '#0f766e');

    $this->actingAs($admin, 'api')->getJson('/api/v1/auth/me')
        ->assertJsonPath('data.tenant.brand.primary', '#0f766e');
});

it('refuses a colour that white text cannot be read on', function () {
    $admin = brandedAdmin();

    $this->actingAs($admin, 'api')->putJson('/api/v1/branding', ['primary_color' => '#ffee00'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('primary_color');
});

it('refuses something that is not a colour', function () {
    $this->actingAs(brandedAdmin(), 'api')->putJson('/api/v1/branding', ['primary_color' => 'blue'])
        ->assertStatus(422);
});

it('does not let the generic settings endpoint skip the readability check', function () {
    $this->actingAs(brandedAdmin(), 'api')->putJson('/api/v1/settings', ['settings' => [['key' => 'branding.primary_color', 'value' => '#ffee00']]])
        ->assertForbidden();
});

it('resets to the default theme when the colour is cleared', function () {
    $admin = brandedAdmin();
    $this->actingAs($admin, 'api')->putJson('/api/v1/branding', ['primary_color' => '#0f766e'])->assertOk();

    $this->actingAs($admin, 'api')->putJson('/api/v1/branding', ['primary_color' => null])
        ->assertOk()
        ->assertJsonPath('data.primary_color', null);
});

it('does not let a customer change branding', function () {
    $customer = actingAsCustomer();

    $this->actingAs($customer, 'api')->putJson('/api/v1/branding', ['primary_color' => '#0f766e'])->assertForbidden();
});

it('colours a workspace\'s ticket email with its brand, and others keep the default', function () {
    $branded = Tenant::create(['name' => 'Brand Co', 'slug' => 'brand-co', 'status' => 'active']);
    SystemSetting::withoutTenantScope()->create(['tenant_id' => $branded->id, 'key' => BrandPalette::SETTING_KEY, 'value' => '#0f766e', 'type' => 'string', 'group' => 'branding']);
    $plain = Tenant::create(['name' => 'Plain Co', 'slug' => 'plain-co', 'status' => 'active']);
    $user = User::factory()->create(['tenant_id' => $branded->id]);

    $render = fn (Tenant $tenant) => (string) (new TicketEventNotification('ticket.created', 'Subject', 'Body', 'https://example.com/t/1', null, $tenant->id))
        ->toMail($user)->render();

    expect($render($branded))->toContain('#0f766e')->not->toContain('#a33900')
        ->and($render($plain))->toContain('#a33900');
});

it('lets an administrator change the sidebar colour on its own, leaving the primary colour alone', function () {
    $admin = brandedAdmin();

    $this->actingAs($admin, 'api')->putJson('/api/v1/branding', ['sidebar_color' => '#14213D'])
        ->assertOk()
        ->assertJsonPath('data.sidebar_color', '#14213d')
        ->assertJsonPath('data.primary_color', null);

    $this->actingAs($admin, 'api')->getJson('/api/v1/auth/me')
        ->assertJsonPath('data.tenant.brand.sidebar', '#14213d')
        ->assertJsonPath('data.tenant.brand.primary', '#a33900');
});

it('keeps the sidebar text readable by refusing a light sidebar colour', function () {
    $this->actingAs(brandedAdmin(), 'api')->putJson('/api/v1/branding', ['sidebar_color' => '#e5eeff'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('sidebar_color');
});

it('keeps the sidebar accent readable on whatever sidebar colour is chosen', function () {
    $palette = BrandPalette::forPrimary('#0f766e', '#000000');

    expect(BrandPalette::contrast($palette['inverse_primary'], '#000000'))->toBeGreaterThanOrEqual(4.5)
        ->and($palette['sidebar'])->toBe('#000000');
});

it('resets only the colour that is cleared', function () {
    $admin = brandedAdmin();
    $this->actingAs($admin, 'api')->putJson('/api/v1/branding', ['primary_color' => '#0f766e', 'sidebar_color' => '#14213d'])->assertOk();

    $this->actingAs($admin, 'api')->putJson('/api/v1/branding', ['sidebar_color' => null])
        ->assertOk()
        ->assertJsonPath('data.sidebar_color', null)
        ->assertJsonPath('data.primary_color', '#0f766e');
});

it('needs at least one colour in the request', function () {
    $this->actingAs(brandedAdmin(), 'api')->putJson('/api/v1/branding', [])->assertStatus(422);
});
