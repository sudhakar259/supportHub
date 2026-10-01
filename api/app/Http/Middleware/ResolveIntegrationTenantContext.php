<?php

namespace App\Http\Middleware;

use App\Models\ApiCredential;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Authenticates every /integration/* request via an API key + secret
 * pair (X-Api-Key / X-Api-Secret headers) — entirely independent of
 * Sanctum/the regular user session, since a tenant's own backend
 * server is the caller here, not a logged-in person. The tenant is
 * derived exclusively from the credential; nothing in the request body
 * is ever consulted for it (section 9/33 of the spec).
 *
 * The resolved credential is attached to the request (as 'apiCredential')
 * for RequireApiScope to check afterward.
 */
class ResolveIntegrationTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->header('X-Api-Key');
        $secret = $request->header('X-Api-Secret');

        if (! $key || ! $secret) {
            return $this->reject('Missing API credentials.');
        }

        $credential = ApiCredential::withoutTenantScope()->where('key', $key)->first();

        if (! $credential || ! $credential->verifySecret($secret)) {
            Log::warning('Integration API authentication failed', ['key' => $key, 'ip' => $request->ip()]);

            return $this->reject('Invalid API credentials.');
        }

        if (! $credential->isActive()) {
            return $this->reject('This API credential has been revoked.');
        }

        $tenant = $credential->tenant;

        if (! $tenant || ! $tenant->isActive()) {
            return $this->reject('This tenant account is suspended or no longer active.');
        }

        $credential->forceFill(['last_used_at' => now()])->saveQuietly();

        app(TenantContext::class)->set($tenant);
        $request->attributes->set('apiCredential', $credential);

        return $next($request);
    }

    private function reject(string $message): Response
    {
        return response()->json(['success' => false, 'message' => $message], 401);
    }
}
