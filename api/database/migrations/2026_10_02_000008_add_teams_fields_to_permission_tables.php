<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adapted from spatie/laravel-permission's own add_teams_fields stub
     * (vendor/spatie/laravel-permission/database/migrations/add_teams_fields.php.stub),
     * with one change: the pivot tables' sentinel default is 0, not 1 —
     * see TenantContext::permissionsTeamId() for why 0 means "platform"
     * in this app's convention. `roles.tenant_id` itself stays nullable
     * (a role can exist with no team, visible regardless of team — used
     * for the Platform Admin role's own definition) while the pivot
     * tables cannot be nullable (NOT NULL is required: they're part of
     * a composite primary key).
     *
     * Guarded with hasColumn() checks, same as spatie's own stub: the
     * base create_permission_tables migration already conditionally
     * creates these columns itself when config('permission.teams') is
     * true at the time it runs (fresh install, teams enabled from the
     * start). This migration is what actually does the work on a
     * database that was migrated before teams was enabled — the real
     * scenario for an app being converted to multi-tenant — and is a
     * safe no-op otherwise.
     */
    public function up(): void
    {
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $pivotRole = $columnNames['role_pivot_key'] ?? 'role_id';
        $pivotPermission = $columnNames['permission_pivot_key'] ?? 'permission_id';
        $teamsKey = $columnNames['team_foreign_key'];
        $modelMorphKey = $columnNames['model_morph_key'];

        if (! Schema::hasColumn($tableNames['roles'], $teamsKey)) {
            Schema::table($tableNames['roles'], function (Blueprint $table) use ($teamsKey) {
                $table->unsignedBigInteger($teamsKey)->nullable()->after('id');
                $table->index($teamsKey, 'roles_tenant_id_index');

                $table->dropUnique('roles_name_guard_name_unique');
                $table->unique([$teamsKey, 'name', 'guard_name']);
            });
        }

        if (! Schema::hasColumn($tableNames['model_has_permissions'], $teamsKey)) {
            Schema::table($tableNames['model_has_permissions'], function (Blueprint $table) use ($tableNames, $teamsKey, $pivotPermission, $modelMorphKey) {
                $table->unsignedBigInteger($teamsKey)->default(0);
                $table->index($teamsKey, 'model_has_permissions_tenant_id_index');

                if (DB::getDriverName() !== 'sqlite') {
                    $table->dropForeign([$pivotPermission]);
                }
                $table->dropPrimary();

                $table->primary(
                    [$teamsKey, $pivotPermission, $modelMorphKey, 'model_type'],
                    'model_has_permissions_permission_model_type_primary'
                );

                if (DB::getDriverName() !== 'sqlite') {
                    $table->foreign($pivotPermission)->references('id')->on($tableNames['permissions'])->cascadeOnDelete();
                }
            });
        }

        if (! Schema::hasColumn($tableNames['model_has_roles'], $teamsKey)) {
            Schema::table($tableNames['model_has_roles'], function (Blueprint $table) use ($tableNames, $teamsKey, $pivotRole, $modelMorphKey) {
                $table->unsignedBigInteger($teamsKey)->default(0);
                $table->index($teamsKey, 'model_has_roles_tenant_id_index');

                if (DB::getDriverName() !== 'sqlite') {
                    $table->dropForeign([$pivotRole]);
                }
                $table->dropPrimary();

                $table->primary(
                    [$teamsKey, $pivotRole, $modelMorphKey, 'model_type'],
                    'model_has_roles_role_model_type_primary'
                );

                if (DB::getDriverName() !== 'sqlite') {
                    $table->foreign($pivotRole)->references('id')->on($tableNames['roles'])->cascadeOnDelete();
                }
            });
        }

        $this->backfillExistingAssignments($tableNames, $teamsKey, $modelMorphKey);

        app('cache')->store(config('permission.cache.store') !== 'default' ? config('permission.cache.store') : null)
            ->forget(config('permission.cache.key'));
    }

    /**
     * Every model_has_roles/model_has_permissions row just got
     * tenant_id = 0 (the column default) regardless of which user it
     * belongs to. Fix that up the same way migration 000006 backfilled
     * users: Administrator-role assignments stay at the platform
     * sentinel (0) — those users were promoted to Platform Admin —
     * everyone else's assignments move to the Default Organization
     * tenant created in that migration.
     */
    private function backfillExistingAssignments(array $tableNames, string $teamsKey, string $modelMorphKey): void
    {
        $tenantId = DB::table('tenants')->where('slug', 'default')->value('id');

        if (! $tenantId) {
            return;
        }

        $adminUserIds = DB::table($tableNames['model_has_roles'])
            ->join($tableNames['roles'], "{$tableNames['roles']}.id", '=', "{$tableNames['model_has_roles']}.role_id")
            ->where("{$tableNames['roles']}.name", 'Administrator')
            ->where("{$tableNames['model_has_roles']}.model_type", \App\Models\User::class)
            ->pluck("{$tableNames['model_has_roles']}.{$modelMorphKey}");

        foreach ([$tableNames['model_has_roles'], $tableNames['model_has_permissions']] as $table) {
            DB::table($table)
                ->where('model_type', \App\Models\User::class)
                ->whereNotIn($modelMorphKey, $adminUserIds)
                ->update([$teamsKey => $tenantId]);
        }

        DB::table($tableNames['roles'])->update([$teamsKey => $tenantId]);
        DB::table($tableNames['roles'])->where('name', 'Administrator')->update([$teamsKey => 0]);
    }

    public function down(): void
    {
        $tableNames = config('permission.table_names');
        $columnNames = config('permission.column_names');
        $teamsKey = $columnNames['team_foreign_key'];

        Schema::table($tableNames['model_has_roles'], function (Blueprint $table) use ($teamsKey) {
            $table->dropColumn($teamsKey);
        });

        Schema::table($tableNames['model_has_permissions'], function (Blueprint $table) use ($teamsKey) {
            $table->dropColumn($teamsKey);
        });

        Schema::table($tableNames['roles'], function (Blueprint $table) use ($teamsKey) {
            $table->dropUnique([$teamsKey, 'name', 'guard_name']);
            $table->unique(['name', 'guard_name']);
            $table->dropColumn($teamsKey);
        });
    }
};
