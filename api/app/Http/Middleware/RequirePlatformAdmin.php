<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Applied to every /platform/* route. A platform administrator is a
 * user with tenant_id = NULL holding the "Platform Admin" role —
 * deliberately a completely separate population from any tenant's
 * "Administrator" (which only ever governs that one tenant). This
 * middleware does NOT set TenantContext: platform routes operate on
 * platform-level tables (tenants, membership_plans, ...) which have no
 * tenant_id at all, and on cross-tenant views via explicit
 * Model::withoutTenantScope() calls in PlatformController methods —
 * never via an ambient "no scope happened to be set" accident.
 */
class RequirePlatformAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Explicit, not assumed: a role/permission check is scoped by
        // whatever team id was last set in this PHP process. A fresh
        // php-fpm/artisan-serve request has none, but a queue worker
        // that just finished a tenant-scoped job would still have that
        // tenant's id set otherwise — platform-admin checks must never
        // inherit a leftover tenant scope. clear() resets both
        // TenantContext and spatie's team id together (see
        // TenantContext::set()).
        app(TenantContext::class)->clear();

        if (! $user || $user->tenant_id !== null || ! $user->hasRole('Platform Admin')) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to perform this action.',
            ], 403);
        }

        return $next($request);
    }
}
