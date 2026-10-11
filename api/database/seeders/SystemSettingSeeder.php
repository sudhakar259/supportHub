<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

/**
 * A handful of representative settings so the Settings screen (and the
 * public/private is_public split SystemSettingController enforces) is
 * demonstrable immediately after setup, instead of starting completely
 * empty (QA finding, 2026-10-01).
 */
class SystemSettingSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            ['key' => 'support_hours_message', 'value' => 'Mon-Fri 9am-5pm UTC', 'type' => 'string', 'group' => 'general', 'is_public' => true],
            ['key' => 'support_email', 'value' => 'support@desknu.test', 'type' => 'string', 'group' => 'general', 'is_public' => true],
            ['key' => 'max_open_tickets_per_customer', 'value' => '10', 'type' => 'integer', 'group' => 'tickets', 'is_public' => false],
            ['key' => 'maintenance_mode', 'value' => 'false', 'type' => 'boolean', 'group' => 'general', 'is_public' => false],
            // Section 39 — tenant-specific email configuration. Platform
            // defaults here (tenant_id null); a tenant that writes its own
            // override via PUT /system-settings forks its own row the
            // same way every other HasTenantOverride setting does.
            ['key' => 'email.sender_name', 'value' => 'DeskNu Team', 'type' => 'string', 'group' => 'email', 'is_public' => false],
            ['key' => 'email.branding_signature', 'value' => "Regards,\nDeskNu Team", 'type' => 'string', 'group' => 'email', 'is_public' => false],
        ];

        foreach ($settings as $setting) {
            SystemSetting::updateOrCreate(['key' => $setting['key']], $setting);
        }
    }
}
