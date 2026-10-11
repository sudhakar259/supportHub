<?php

use App\Exceptions\ApiExceptionRenderer;
use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\IdempotentRequest;
use App\Http\Middleware\RequireApiScope;
use App\Http\Middleware\RequirePlatformAdmin;
use App\Http\Middleware\ResolveIntegrationTenantContext;
use App\Http\Middleware\ResolveTenantContext;
use App\Http\Middleware\ResolveWorkspace;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Routing\Middleware\ThrottleRequests;
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
    // Every listener is registered explicitly in AppServiceProvider. Framework
    // discovery would scan app/Listeners and register each one a second time,
    // so every ticket notification and webhook fired twice.
    ->withEvents(discover: false)
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            SecurityHeaders::class,
            ForceJsonResponse::class,
            ResolveWorkspace::class,
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
            'idempotent' => IdempotentRequest::class,
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

        // ResolveIntegrationTenantContext additionally needs to run
        // before ThrottleRequests specifically (not just SubstituteBindings):
        // the 'integration' rate limiter (see AppServiceProvider) reads
        // $request->attributes->get('apiCredential'), which this
        // middleware is what sets. ThrottleRequests already sits before
        // SubstituteBindings in Laravel's own default priority list, so
        // "before: SubstituteBindings" alone was not strong enough —
        // Laravel's priority-based sort enforces the LISTED order
        // between any two middleware that are both in the priority map,
        // regardless of their declared order in the route's own
        // middleware array (['integration.auth', 'throttle:integration']
        // would otherwise still run throttle first). Same bug class as
        // the SubstituteBindings fix below, caught by reasoning through
        // SortedMiddleware::sort() before it ever shipped.
        $middleware->prependToPriorityList(
            before: ThrottleRequests::class,
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
