<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * Spatie's own Role model has no global tenant scope — "teams" scoping
 * only happens inside the package's own query helpers (findByName(),
 * the pivot-filtered roles() relation, etc.), never for a plain
 * Role::all() / Role::find($id) / implicit route-model binding. Before
 * this subclass existed, RoleController's index/show/update/destroy
 * were a real cross-tenant leak: any tenant admin could list, view,
 * rename, reassign permissions on, or delete any OTHER tenant's role
 * by id, since nothing filtered those queries at all.
 *
 * Swapped in via config('permission.models.role'), so every spatie
 * internal (assignRole(), syncPermissions(), Role::create(), ...) and
 * every plain Eloquent/route-binding call in this app goes through the
 * same TenantScope global scope as every other tenant-owned model.
 * Harmless for the one role that's meant to be tenant_id = NULL
 * (Platform Admin): TenantScope is a no-op when no tenant context is
 * active, which is exactly when platform-level code touches that role.
 */
class Role extends SpatieRole
{
    use BelongsToTenant;
}
