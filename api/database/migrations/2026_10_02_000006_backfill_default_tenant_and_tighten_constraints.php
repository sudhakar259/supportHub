<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * This system had exactly one tenant's worth of data before this
     * migration — there is no ambiguity to "invent": every existing row
     * unambiguously belongs to the one organization that was using this
     * installation. A "Default Organization" tenant is created and every
     * pre-existing row is backfilled to it. A genuinely ambiguous dataset
     * (multiple unrelated organizations already mixed in one database)
     * would need a real mapping decision instead of this backfill —
     * that is not the situation here.
     *
     * Platform administrator accounts (if any already exist with the
     * Administrator role) are deliberately NOT backfilled — they become
     * tenant_id = NULL, i.e. promoted to platform admins, since
     * "Administrator" pre-migration had unrestricted access to
     * everything, which is what a platform admin is.
     */
    public function up(): void
    {
        // insertOrGet rather than a bare insert: MySQL DDL later in this
        // method auto-commits whatever DML ran before it, so if this
        // migration fails partway through (e.g. the constraint-tightening
        // step below) and is re-run, the "Default Organization" row from
        // the first attempt is already permanently there — a plain
        // insertGetId() would then fail on the unique slug instead of
        // resuming.
        $tenantId = DB::table('tenants')->where('slug', 'default')->value('id');

        if (! $tenantId) {
            $tenantId = DB::table('tenants')->insertGetId([
                'name' => 'Default Organization',
                'slug' => 'default',
                'status' => 'active',
                'timezone' => 'UTC',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $adminUserIds = DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('roles.name', 'Administrator')
            ->where('model_has_roles.model_type', User::class)
            ->pluck('model_has_roles.model_id');

        DB::table('users')->whereNotIn('id', $adminUserIds)->update(['tenant_id' => $tenantId]);

        foreach ([
            'customers', 'departments', 'tickets', 'ticket_messages', 'ticket_attachments',
            'ticket_assignments', 'ticket_activities', 'ticket_status_history', 'ticket_slas',
            'ticket_statuses', 'ticket_priorities', 'ticket_categories', 'ticket_tags',
            'business_hours', 'sla_policies', 'ticket_number_settings', 'ticket_number_sequences',
            'ticket_routing_rules',
        ] as $tableName) {
            DB::table($tableName)->update(['tenant_id' => $tenantId]);
        }

        // notification_templates / system_settings: leave tenant_id NULL
        // (they become the platform-level defaults every tenant falls
        // back to) rather than backfilling — that is their intended
        // permanent "unowned" state, not a gap to fill in.
        //
        // Plain per-row updates rather than an UPDATE...JOIN: the latter's
        // generated SQL isn't portable across sqlite/mysql for this shape.
        DB::table('notification_preferences')->update(['tenant_id' => $tenantId]);

        $this->tightenUniqueConstraints();
    }

    /**
     * MySQL DDL auto-commits per statement, so a failure partway through
     * this method (as originally happened at the ticket_number_sequences
     * step below) leaves the earlier tables already converted — a re-run
     * must skip whatever's already done rather than erroring on an index
     * that no longer exists under its old name.
     */
    private function indexExists(string $table, string $indexName): bool
    {
        return collect(Schema::getIndexes($table))->contains('name', $indexName);
    }

    private function tightenUniqueConstraints(): void
    {
        if ($this->indexExists('users', 'users_email_unique')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropUnique('users_email_unique');
                $table->unique(['tenant_id', 'email']);
            });
        }

        if ($this->indexExists('departments', 'departments_code_unique')) {
            Schema::table('departments', function (Blueprint $table) {
                $table->dropUnique('departments_code_unique');
                $table->unique(['tenant_id', 'code']);
            });
        }

        if ($this->indexExists('tickets', 'tickets_ticket_number_unique')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->dropUnique('tickets_ticket_number_unique');
                $table->unique(['tenant_id', 'ticket_number']);
            });
        }

        if ($this->indexExists('ticket_statuses', 'ticket_statuses_slug_unique')) {
            Schema::table('ticket_statuses', function (Blueprint $table) {
                $table->dropUnique('ticket_statuses_slug_unique');
                $table->unique(['tenant_id', 'slug']);
            });
        }

        if ($this->indexExists('ticket_priorities', 'ticket_priorities_slug_unique')) {
            Schema::table('ticket_priorities', function (Blueprint $table) {
                $table->dropUnique('ticket_priorities_slug_unique');
                $table->unique(['tenant_id', 'slug']);
            });
        }

        if ($this->indexExists('ticket_number_sequences', 'ticket_number_sequences_unique')) {
            Schema::table('ticket_number_sequences', function (Blueprint $table) {
                // ticket_number_sequences_unique is the index MySQL's InnoDB
                // chose to back the ticket_number_settings_id foreign key
                // (its leftmost column), so it can't be dropped on its own —
                // the FK has to be dropped and recreated around the swap,
                // since the replacement unique index below leads with
                // tenant_id instead and can't serve as the FK's index.
                $table->dropForeign(['ticket_number_settings_id']);
                $table->dropUnique('ticket_number_sequences_unique');
                $table->unique(['tenant_id', 'ticket_number_settings_id', 'period_key'], 'ticket_number_sequences_tenant_unique');
                $table->foreign('ticket_number_settings_id')->references('id')->on('ticket_number_settings')->cascadeOnDelete();
            });
        }

        // MySQL only: enforce NOT NULL on the tenant_id columns that are
        // always-required (everything except users/notification_templates/
        // system_settings/audit_logs/notification_logs, which are
        // intentionally nullable — see the migrations that added them).
        // Skipped on sqlite: MODIFY COLUMN needs doctrine/dbal there, and
        // the application layer (BelongsToTenant) already guarantees these
        // are always populated, which is what the test suite exercises.
        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        foreach ([
            'customers', 'departments', 'tickets', 'ticket_messages', 'ticket_attachments',
            'ticket_assignments', 'ticket_activities', 'ticket_status_history', 'ticket_slas',
            'ticket_statuses', 'ticket_priorities', 'ticket_categories', 'ticket_tags',
            'business_hours', 'sla_policies', 'ticket_number_settings', 'ticket_number_sequences',
            'ticket_routing_rules',
        ] as $tableName) {
            DB::statement("ALTER TABLE `{$tableName}` MODIFY `tenant_id` BIGINT UNSIGNED NOT NULL");
        }
    }

    public function down(): void
    {
        // Backfill is not reversible in a meaningful way (which rows were
        // "already null" vs "set by this migration" is not recoverable);
        // down() only reverts the constraint changes.
        Schema::table('ticket_number_sequences', function (Blueprint $table) {
            $table->dropForeign(['ticket_number_settings_id']);
            $table->dropUnique('ticket_number_sequences_tenant_unique');
            $table->unique(['ticket_number_settings_id', 'period_key'], 'ticket_number_sequences_unique');
            $table->foreign('ticket_number_settings_id')->references('id')->on('ticket_number_settings')->cascadeOnDelete();
        });

        Schema::table('ticket_priorities', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'slug']);
            $table->unique('slug');
        });

        Schema::table('ticket_statuses', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'slug']);
            $table->unique('slug');
        });

        Schema::table('tickets', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'ticket_number']);
            $table->unique('ticket_number');
        });

        Schema::table('departments', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'code']);
            $table->unique('code');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'email']);
            $table->unique('email');
        });
    }
};
