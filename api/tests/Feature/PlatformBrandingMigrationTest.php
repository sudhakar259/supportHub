<?php

use Illuminate\Support\Facades\DB;

it('refreshes only old platform branding and preserves tenant overrides and custom values', function () {
    $tenant = testTenant();
    DB::table('system_settings')->insert([
        ['tenant_id' => null, 'key' => 'email.sender_name', 'value' => 'Support24 Team', 'type' => 'string', 'group' => 'email', 'is_public' => false],
        ['tenant_id' => null, 'key' => 'email.branding_signature', 'value' => "Regards,\nSupportHub", 'type' => 'string', 'group' => 'email', 'is_public' => false],
        ['tenant_id' => $tenant->id, 'key' => 'email.sender_name', 'value' => 'Support24 Team', 'type' => 'string', 'group' => 'email', 'is_public' => false],
    ]);
    $migration = require database_path('migrations/2026_10_11_000001_rebrand_platform_email_defaults.php');
    $migration->up();
    $migration->up();

    expect(DB::table('system_settings')->whereNull('tenant_id')->where('key', 'email.sender_name')->value('value'))->toBe('DeskZeal Team');
    expect(DB::table('system_settings')->whereNull('tenant_id')->where('key', 'email.branding_signature')->value('value'))->toBe("Regards,\nDeskZeal Team");
    expect(DB::table('system_settings')->where('tenant_id', $tenant->id)->where('key', 'email.sender_name')->value('value'))->toBe('Support24 Team');

    DB::table('system_settings')->whereNull('tenant_id')->where('key', 'email.sender_name')->update(['value' => 'Custom Operator']);
    $migration->up();
    expect(DB::table('system_settings')->whereNull('tenant_id')->where('key', 'email.sender_name')->value('value'))->toBe('Custom Operator');
});
