<?php

$workspaceDomain = strtolower(trim((string) env('WORKSPACE_DOMAIN'), '. '));
if (! $workspaceDomain && env('APP_ENV') !== 'production' && parse_url(env('FRONTEND_URL', ''), PHP_URL_HOST) === 'localhost') {
    $workspaceDomain = 'localhost';
}
$workspacePort = env('WORKSPACE_PORT');
$workspacePattern = $workspaceDomain
    ? '~\A'.($workspaceDomain === 'localhost' ? 'https?' : preg_quote(env('WORKSPACE_SCHEME', 'https'), '~'))
        .'://[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.'.preg_quote($workspaceDomain, '~')
        .($workspaceDomain === 'localhost' ? '(?::[0-9]+)?' : ($workspacePort ? ':'.preg_quote($workspacePort, '~') : '')).'\z~'
    : null;

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_values(array_unique(array_filter(array_merge(
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:5181')),
        [config('app.frontend_url')],
    )))),

    'allowed_origins_patterns' => array_filter([$workspacePattern]),

    'allowed_headers' => ['*'],

    // Lets the web app read the file name the server suggests for a download.
    'exposed_headers' => ['Content-Disposition'],

    'max_age' => 0,

    'supports_credentials' => false,

];
