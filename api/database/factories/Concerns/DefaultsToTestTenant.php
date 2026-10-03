<?php

namespace Database\Factories\Concerns;

use App\Support\TenantContext;

/**
 * Every tenant-owned model's factory needs a tenant_id default, or a
 * bare Model::factory()->create() call (which almost every existing
 * test makes, pre-dating multi-tenancy) would silently create a row
 * invisible to every tenant-scoped query (TenantScope filters
 * `tenant_id = X`, and NULL never equals X).
 *
 * Prefers whatever TenantContext is actively set (seeders, or a
 * factory used inside TenantContext::runAs($someTenant, ...)) over
 * tests/Pest.php's shared per-test tenant — checking
 * isEstablished() FIRST is deliberate: testTenant() doesn't just
 * return the per-test tenant, it also force-sets it as the ambient
 * context as a side effect. Calling it from here unconditionally would
 * silently override an explicit runAs($otherTenant, ...) wrapper on
 * every nested factory call inside that closure — including
 * runAs(null, ...) (actingAsPlatformAdmin()'s own wrapper): a bare
 * `$tenantId = ...->id()` check can't tell "nobody has touched the
 * context yet" apart from "the context was deliberately, explicitly
 * set to null," since both read back as null. Checking
 * isEstablished() instead respects the latter case too — e.g.
 * actingAsPlatformAdmin()'s User::factory()->create(['tenant_id' =>
 * null]) must not silently resurrect/attach the per-test tenant and
 * clobber the platform (null) context before assignRole() runs.
 * Only falls back to testTenant() — lazily creating and establishing
 * the per-test tenant — when no context is active at all (a bare
 * Model::factory()->create() with no actingAsX()/runAs() wrapper,
 * which is the original problem testTenant() solves).
 */
trait DefaultsToTestTenant
{
    protected static function defaultTenantId(): ?int
    {
        $context = app(TenantContext::class);

        if ($context->isEstablished()) {
            return $context->id();
        }

        if (function_exists('testTenant')) {
            return testTenant()->id;
        }

        return null;
    }
}
