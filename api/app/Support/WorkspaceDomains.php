<?php

namespace App\Support;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\Request;

class WorkspaceDomains
{
    public static function domain(): ?string
    {
        $domain = strtolower(trim((string) config('workspaces.domain'), '. '));

        // Local development works without DNS or editing a hosts file.
        if (! $domain && ! app()->isProduction() && parse_url(config('app.frontend_url'), PHP_URL_HOST) === 'localhost') {
            return 'localhost';
        }

        return $domain ?: null;
    }

    public static function validSlug(string $slug): bool
    {
        return (bool) preg_match('/\A[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\z/', $slug)
            && ! in_array($slug, config('workspaces.reserved'), true);
    }

    public static function slugFromHost(string $host): ?string
    {
        $domain = static::domain();
        $host = strtolower(rtrim($host, '.'));
        if (! $domain || ! str_ends_with($host, '.'.$domain)) {
            return null;
        }

        $slug = substr($host, 0, -strlen('.'.$domain));

        return static::validSlug($slug) ? $slug : null;
    }

    public static function url(?Tenant $tenant, string $path = ''): string
    {
        $domain = static::domain();
        if (! $tenant || ! $domain || ! static::validSlug($tenant->slug)) {
            return rtrim(config('app.frontend_url'), '/').$path;
        }

        $scheme = $domain === 'localhost' ? 'http' : config('workspaces.scheme');
        $port = config('workspaces.port') ?: ($domain === 'localhost' ? parse_url(config('app.frontend_url'), PHP_URL_PORT) : null);

        return $scheme.'://'.$tenant->slug.'.'.$domain.($port ? ':'.$port : '').$path;
    }

    public static function assertUserMatches(Request $request, User $user): void
    {
        $slug = $request->attributes->get('workspace_slug');
        abort_if($slug && $user->tenant?->slug !== $slug, 403, 'This account does not belong to this workspace.');
    }
}
