<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Support\WorkspaceDomains;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

/** Narrows the workspace; authenticated identity still owns TenantContext. */
class ResolveWorkspace
{
    public function handle(Request $request, Closure $next): Response
    {
        $hostSlug = WorkspaceDomains::slugFromHost($request->getHost());
        $headerSlug = $request->header('X-Workspace');
        if ($headerSlug !== null) {
            abort_unless(WorkspaceDomains::validSlug($headerSlug), 400, 'Invalid workspace identifier.');
            abort_if($hostSlug && $hostSlug !== $headerSlug, 403, 'The workspace does not match this address.');
        }
        $slug = $hostSlug ?: $headerSlug;
        if (! $slug) {
            return $next($request);
        }

        if (! Tenant::where('slug', $slug)->exists()) {
            return response()->json(['success' => false, 'message' => 'This workspace could not be found.'], 404);
        }
        $request->attributes->set('workspace_slug', $slug);

        if ($user = $request->user('api')) {
            WorkspaceDomains::assertUserMatches($request, $user);
        }

        if ($request->is('api/v1/auth/login', 'api/v1/auth/register', 'api/v1/auth/forgot-password', 'api/v1/auth/reset-password')) {
            if ($request->filled('tenant') && $request->input('tenant') !== $slug) {
                throw ValidationException::withMessages(['tenant' => ['Use the organization for this workspace address.']]);
            }
            $request->merge(['tenant' => $slug]);
        }

        return $next($request);
    }
}
