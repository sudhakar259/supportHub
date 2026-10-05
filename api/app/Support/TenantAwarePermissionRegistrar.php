<?php

namespace App\Support;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Collection;
use Spatie\Permission\PermissionRegistrar;

/**
 * App\Models\Role applies BelongsToTenant (a real, necessary fix for a
 * cross-tenant role-ID leak — see that model's own docblock), which adds
 * a global TenantScope to every Role query. That global scope also
 * silently applies to PermissionRegistrar::getPermissionsWithRoles() —
 * the one query spatie/laravel-permission uses to build its entire
 * cached permission-to-role map — because it eager-loads
 * Permission::roles(), a relation to the same scoped Role model.
 *
 * That cache is built once and shared process-wide regardless of which
 * tenant happens to be active at the moment it builds, so whichever
 * tenant's TenantContext was active when the cache last warmed silently
 * became the ONLY tenant whose roles exist in it — every other tenant's
 * permission checks then fail with "This action is unauthorized" until
 * the cache is flushed and rebuilt under their own tenant (at which
 * point the previously-working tenant starts failing instead).
 * Reproduced live: tenant A's admin worked after a fresh cache; a
 * tenant B admin logging in next got 403 on every tenant-scoped
 * request, with the correct role and correct permissions-team-id
 * resolved, simply because tenant B's role never made it into the
 * cached map.
 *
 * The cache must contain every tenant's roles — team-filtering belongs
 * only at the per-user check (the already-correctly-scoped
 * model_has_roles pivot), never baked into this shared cache. Fixed by
 * overriding just this one query to bypass TenantScope on the
 * eager-loaded relation; everything else in the base registrar is
 * unchanged.
 */
class TenantAwarePermissionRegistrar extends PermissionRegistrar
{
    protected function getPermissionsWithRoles(): Collection
    {
        return $this->permissionClass::select()
            ->with(['roles' => fn ($query) => $query->withoutGlobalScope(TenantScope::class)])
            ->get();
    }
}
