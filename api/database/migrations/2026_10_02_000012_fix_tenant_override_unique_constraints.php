<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * notification_templates.key and system_settings.key kept their
     * original *global* unique constraint when tenant_id was added to
     * these two tables (2026_10_02_000005) — unlike every other table
     * tightened in 2026_10_02_000006, which this one should have been
     * alongside. HasTenantOverride's intended copy-on-write (a tenant's
     * first edit of a platform-default row inserts its OWN override
     * rather than mutating the shared default — see
     * NotificationTemplateController/SystemSettingController::update())
     * could therefore never actually succeed: every such insert collided
     * with the platform default's own row on this same global key. A
     * composite (tenant_id, key) unique allows exactly one platform
     * default (tenant_id NULL) plus one override per tenant per key —
     * MySQL and SQLite both treat NULL as distinct in a unique index, so
     * the NULL default row never collides with any tenant's override.
     */
    public function up(): void
    {
        Schema::table('notification_templates', function (Blueprint $table) {
            $table->dropUnique('notification_templates_key_unique');
            $table->unique(['tenant_id', 'key']);
        });

        Schema::table('system_settings', function (Blueprint $table) {
            $table->dropUnique('system_settings_key_unique');
            $table->unique(['tenant_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::table('system_settings', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'key']);
            $table->unique('key');
        });

        Schema::table('notification_templates', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'key']);
            $table->unique('key');
        });
    }
};
