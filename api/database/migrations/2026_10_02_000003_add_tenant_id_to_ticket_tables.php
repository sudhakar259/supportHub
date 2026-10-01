<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * tenant_id is added directly to every ticket-child table (not only
     * `tickets` itself) even though it's always derivable via the
     * ticket relationship. This is deliberate defense-in-depth: the
     * global tenant scope (BelongsToTenant) can filter these tables
     * without a join, and a stray query that forgets to scope via the
     * parent ticket still can't cross a tenant boundary.
     */
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->index(['tenant_id', 'status_id']);
            $table->index(['tenant_id', 'created_at']);
        });

        Schema::table('ticket_messages', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->index('tenant_id');
        });

        Schema::table('ticket_attachments', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->index('tenant_id');
        });

        Schema::table('ticket_assignments', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->index('tenant_id');
        });

        Schema::table('ticket_activities', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->index('tenant_id');
        });

        Schema::table('ticket_status_history', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->index('tenant_id');
        });

        Schema::table('ticket_slas', function (Blueprint $table) {
            $table->foreignId('tenant_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        foreach (['ticket_slas', 'ticket_status_history', 'ticket_activities', 'ticket_assignments', 'ticket_attachments', 'ticket_messages', 'tickets'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('tenant_id');
            });
        }
    }
};
