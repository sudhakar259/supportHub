<?php

use App\Exceptions\ApiExceptionRenderer;
use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\RequireApiScope;
use App\Http\Middleware\RequirePlatformAdmin;
use App\Http\Middleware\ResolveIntegrationTenantContext;
use App\Http\Middleware\ResolveTenantContext;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        apiPrefix: 'api/v1',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            ForceJsonResponse::class,
        ]);

        $middleware->throttleApi();

        $middleware->alias([
            'permission' => PermissionMiddleware::class,
            'role' => RoleMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'tenant.context' => ResolveTenantContext::class,
            'platform.admin' => RequirePlatformAdmin::class,
            'integration.auth' => ResolveIntegrationTenantContext::class,
            'scope' => RequireApiScope::class,
        ]);

        // CRITICAL: Laravel's SubstituteBindings middleware (which
        // performs the actual DB query behind every {department},
        // {ticket}, {customer}, ... route parameter) is part of the
        // 'api' middleware GROUP, which always runs before any
        // route-level middleware unless given explicit priority —
        // unlike auth:api's Authenticate, our tenant-resolving
        // middleware isn't in Laravel's default priority list at all.
        // Without this, SubstituteBindings resolves the route model
        // BEFORE TenantContext is ever set from the request, so
        // TenantScope has nothing to filter by yet: in a fresh request
        // (no leftover ambient state) it runs completely unscoped, and
        // any tenant's credential/session could fetch any OTHER
        // tenant's row by id. Discovered via a cold-request
        // regression test, not caught by warm test helpers that
        // happen to pre-establish the right context before firing a
        // request.
        $middleware->prependToPriorityList(
            before: SubstituteBindings::class,
            prepend: ResolveTenantContext::class,
        );
        $middleware->prependToPriorityList(
            before: SubstituteBindings::class,
            prepend: ResolveIntegrationTenantContext::class,
        );
        $middleware->prependToPriorityList(
            before: SubstituteBindings::class,
            prepend: RequirePlatformAdmin::class,
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(function (Throwable $e, Request $request) {
            return ApiExceptionRenderer::render($e, $request);
        });
    })->create();
