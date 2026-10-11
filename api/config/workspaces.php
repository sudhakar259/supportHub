<?php

return [
    // Bare parent domain, e.g. desknu.com. All tenants share the same app.
    'domain' => env('WORKSPACE_DOMAIN'),
    'scheme' => env('WORKSPACE_SCHEME', 'https'),
    'port' => env('WORKSPACE_PORT'),
    'reserved' => ['www', 'api', 'app', 'admin', 'platform', 'mail', 'smtp', 'status', 'docs', 'cdn', 'assets', 'support', 'demo'],
];
