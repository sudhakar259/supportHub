<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route middleware parameter, e.g. ->middleware('scope:tickets.create').
 * Must run after ResolveIntegrationTenantContext, which attaches the
 * resolved credential to the request.
 */
class RequireApiScope
{
    public function handle(Request $request, Closure $next, string $scope): Response
    {
        $credential = $request->attributes->get('apiCredential');

        if (! $credential || ! $credential->hasScope($scope)) {
            return response()->json([
                'success' => false,
                'message' => "This API credential does not have the required scope: {$scope}.",
            ], 403);
        }

        return $next($request);
    }
}
