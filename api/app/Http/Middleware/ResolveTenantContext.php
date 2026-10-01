<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpFoundation\Response;

/**
 * Applied to every tenant-workspace route (everything except /auth/*,
 * /platform/*, and /integration/*). Resolves the tenant from the
 * authenticated Sanctum user — never from request input — and sets
 * both TenantContext (drives TenantScope on every tenant-owned model)
 * and spatie/laravel-permission's team id (so a role/permission check
 * is automatically scoped to this tenant too).
 *
 * A platform-administrator account (tenant_id = NULL) hitting a
 * tenant-workspace route is rejected: platform admins operate through
 * /platform/* instead, and must never see tenant data "because no
 * scope happened to apply."
 */
class ResolveTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->tenant_id) {
            return response()->json([
                'success' => false,
                'message' => 'This endpoint requires an authenticated tenant user.',
            ], 403);
        }

        $tenant = $user->tenant;

        if (! $tenant || ! $tenant->isActive()) {
            return response()->json([
                'success' => false,
                'message' => 'This tenant account is suspended or no longer active.',
            ], 403);
        }

        $context = app(TenantContext::class);
        $context->set($tenant);
        app(PermissionRegistrar::class)->setPermissionsTeamId($context->permissionsTeamId());

        return $next($request);
    }
}
