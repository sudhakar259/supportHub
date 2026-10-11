<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForceJsonResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        // The emailed verification link is opened by a browser, which must be
        // sent on to the app; only API clients that ask for JSON get JSON there.
        if (! $request->routeIs('verification.verify')) {
            $request->headers->set('Accept', 'application/json');
        }

        return $next($request);
    }
}
