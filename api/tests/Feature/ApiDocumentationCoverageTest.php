<?php

use Illuminate\Support\Facades\Route;

/**
 * Route parameters are compared by position only, because Scribe renames them in the collection (e.g. {user} becomes :user_id).
 * Fails when a public API route has no entry in the generated Scribe collection.
 * Regenerate the docs with `php artisan scribe:generate` after adding a route.
 */
function normalise(string $path): string
{
    return preg_replace('/(\{[^}]+\}|:[a-z_]+)/', '{}', ltrim($path, '/'));
}

// Scribe documents a PUT|PATCH route once, under PUT.
function documentedMethod(string $method): string
{
    return $method === 'PATCH' ? 'PUT' : $method;
}

it('documents every public API route in the generated Scribe collection', function () {
    $path = resource_path('developer-docs/reference/collection.json');
    expect(file_exists($path))->toBeTrue('Run php artisan scribe:generate to create the private endpoint reference.');

    $documented = [];
    $walk = function (array $items) use (&$walk, &$documented): void {
        foreach ($items as $item) {
            if (isset($item['item'])) {
                $walk($item['item']);

                continue;
            }

            $documented[] = strtoupper($item['request']['method']).' '.normalise($item['request']['url']['path'] ?? $item['request']['url']);
        }
    };
    $walk(json_decode(file_get_contents($path), true)['item'] ?? []);

    $undocumented = collect(Route::getRoutes()->getRoutes())
        ->filter(fn ($route) => str_starts_with($route->uri(), 'api/v1/'))
        ->flatMap(fn ($route) => collect($route->methods())
            ->reject(fn (string $method) => $method === 'HEAD')
            ->map(fn (string $method) => documentedMethod($method).' '.normalise($route->uri())))
        ->reject(fn (string $key) => in_array($key, $documented, true))
        ->values()
        ->all();

    expect($undocumented)->toBe([]);
});
