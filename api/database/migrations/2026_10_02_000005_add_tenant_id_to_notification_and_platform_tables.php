<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Unlike the other tenant_id columns added in this migration batch,
     * these stay permanently nullable by design:
     *   - notification_templates: NULL = platform default (seeded once,
     *     shared fallback), set = a tenant's own override of that
     *     template. TemplateRenderingService looks up the tenant-specific
     *     row first and falls back to the NULL/platform row.
     *   - system_settings: same NULL-as-platform-default /
     *     set-as-tenant-override pattern.
     *   - audit_logs / notification_logs: a platform-level action
     *     (e.g. a platform admin suspending a tenant) legitimately has
     *     no single tenant to attribute to.
     */
    public function up(): void
    {
        foreach (['notification_templates', 'notification_preferences', 'notification_logs', 'audit_logs', 'system_settings'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('tenant_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
                $table->index('tenant_id');
            });
        }
    }

    public function down(): void
    {
        foreach (['system_settings', 'audit_logs', 'notification_logs', 'notification_preferences', 'notification_templates'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('tenant_id');
            });
        }
    }
};
