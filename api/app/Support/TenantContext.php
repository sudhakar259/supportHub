<?php

namespace App\Support;

use App\Models\Tenant;

/**
 * The single source of truth for "which tenant is this request/process
 * operating as." Bound as a singleton (one instance per request in the
 * HTTP lifecycle, one per process for console commands).
 *
 * Deliberately NOT auto-resolved from anywhere implicit (no session, no
 * subdomain magic) — it is only ever set explicitly, by:
 *   - ResolveTenantContext middleware, from the authenticated Sanctum
 *     user's tenant_id, for every tenant-workspace route
 *   - ResolveIntegrationTenantContext middleware, from the authenticated
 *     API credential's tenant_id, for every /integration/* route
 *   - Seeders/artisan commands, explicitly, when provisioning a
 *     specific tenant's data
 *
 * When unset, TenantScope (the global scope every tenant-owned model
 * uses) does not filter at all — this is the deliberate, narrow
 * "platform/console" escape hatch, not an oversight. Routes that must
 * never run without a resolved tenant are protected by
 * ResolveTenantContext's requireTenant(), not by this class.
 */
class TenantContext
{
    private ?Tenant $tenant = null;

    public function set(?Tenant $tenant): void
    {
        $this->tenant = $tenant;
    }

    public function get(): ?Tenant
    {
        return $this->tenant;
    }

    public function id(): ?int
    {
        return $this->tenant?->id;
    }

    /**
     * spatie/laravel-permission's teams pivot (model_has_roles /
     * model_has_permissions) requires a NOT NULL team id — it's part of
     * a composite primary key, and wherePivot($key, null) would compile
     * to "= NULL", which never matches any row, even one that is
     * genuinely NULL. 0 is used as the "platform" sentinel there (never
     * a real tenant id, since those auto-increment from 1) — it is
     * purely an internal detail of how spatie's pivot is queried, not a
     * real tenant; TenantScope and every other tenant_id column in this
     * app still use true NULL for "no tenant."
     */
    public function permissionsTeamId(): int
    {
        return $this->tenant?->id ?? 0;
    }

    public function has(): bool
    {
        return $this->tenant !== null;
    }

    public function clear(): void
    {
        $this->tenant = null;
    }

    /**
     * Run a callback as a specific tenant, restoring the previous
     * context afterward regardless of exceptions. Used by seeders
     * provisioning multiple tenants' data in one process, and by any
     * platform-level code that needs to act "as" a tenant momentarily.
     */
    public function runAs(?Tenant $tenant, callable $callback): mixed
    {
        $previous = $this->tenant;
        $this->set($tenant);

        try {
            return $callback();
        } finally {
            $this->set($previous);
        }
    }
}
