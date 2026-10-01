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
            ['key' => 'support_email', 'value' => 'support@supporthub.test', 'type' => 'string', 'group' => 'general', 'is_public' => true],
            ['key' => 'max_open_tickets_per_customer', 'value' => '10', 'type' => 'integer', 'group' => 'tickets', 'is_public' => false],
            ['key' => 'maintenance_mode', 'value' => 'false', 'type' => 'boolean', 'group' => 'general', 'is_public' => false],
        ];

        foreach ($settings as $setting) {
            SystemSetting::updateOrCreate(['key' => $setting['key']], $setting);
        }
    }
}
