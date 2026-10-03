<?php

namespace App\Support;

use App\Models\Tenant;
use Spatie\Permission\PermissionRegistrar;

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

    /**
     * Separate from "$this->tenant === null" on purpose: that condition
     * is also true for the deliberate platform/no-tenant context (see
     * runAs(null, ...), RequirePlatformAdmin::clear()), and callers that
     * need "has set() ever actually been called" — chiefly
     * DefaultsToTestTenant, deciding whether to respect an explicit
     * platform context or lazily fall back to the shared per-test
     * tenant — need to tell that apart from "nothing has touched this
     * yet." isEstablished() answers that; id()/get() still answer "what
     * tenant, if any."
     */
    private bool $established = false;

    /**
     * Also syncs spatie/laravel-permission's team id in the same call —
     * the two must never drift apart, since every role/permission check
     * anywhere in the app implicitly depends on it matching whatever
     * tenant TenantScope is currently filtering to.
     */
    public function set(?Tenant $tenant): void
    {
        $this->tenant = $tenant;
        $this->established = true;
        app(PermissionRegistrar::class)->setPermissionsTeamId($this->permissionsTeamId());
    }

    public function isEstablished(): bool
    {
        return $this->established;
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
        $this->set(null);
    }

    /**
     * Run a callback as a specific tenant, restoring the previous
     * context afterward regardless of exceptions. Used by seeders
     * provisioning multiple tenants' data in one process, and by any
     * platform-level code that needs to act "as" a tenant momentarily.
     *
     * Restores $established as well as $tenant — not just via
     * set($previousTenant) — because set() always marks the context
     * established. Restoring through set() alone would leave a
     * genuinely never-established context (isEstablished() === false
     * before this call) looking established afterward, which breaks
     * DefaultsToTestTenant's fallback for any code that runs after this
     * returns: a test building tenant B via
     * runAs($tenantB, fn () => TenantProvisioningService::provision($tenantB))
     * before anything else has touched the context must come back out
     * exactly as unestablished as it went in.
     */
    public function runAs(?Tenant $tenant, callable $callback): mixed
    {
        $previousTenant = $this->tenant;
        $previousEstablished = $this->established;
        $this->set($tenant);

        try {
            return $callback();
        } finally {
            $this->tenant = $previousTenant;
            $this->established = $previousEstablished;
            app(PermissionRegistrar::class)->setPermissionsTeamId($this->permissionsTeamId());
        }
    }
}
