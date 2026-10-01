<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Reference/configuration data that becomes tenant-owned: every
     * tenant gets its own copy of statuses/priorities/categories/tags/
     * business hours/SLA policies/routing rules/ticket numbering,
     * seeded with the same defaults at tenant creation and independently
     * customizable from then on (see TenantProvisioningService).
     */
    public function up(): void
    {
        foreach ([
            'ticket_statuses',
            'ticket_priorities',
            'ticket_categories',
            'ticket_tags',
            'business_hours',
            'sla_policies',
            'ticket_number_settings',
            'ticket_number_sequences',
            'ticket_routing_rules',
        ] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('tenant_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
                $table->index('tenant_id');
            });
        }
    }

    public function down(): void
    {
        foreach ([
            'ticket_routing_rules',
            'ticket_number_sequences',
            'ticket_number_settings',
            'sla_policies',
            'business_hours',
            'ticket_tags',
            'ticket_categories',
            'ticket_priorities',
            'ticket_statuses',
        ] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('tenant_id');
            });
        }
    }
};
