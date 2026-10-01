<?php

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Registered under /api/v1 (see bootstrap/app.php: apiPrefix). Split into
| one file per domain under routes/api/ to keep this file navigable as
| the endpoint count grows.
|
*/

require __DIR__.'/api/auth.php';
require __DIR__.'/api/users.php';
require __DIR__.'/api/roles.php';
require __DIR__.'/api/departments.php';
require __DIR__.'/api/customers.php';
require __DIR__.'/api/categories.php';
require __DIR__.'/api/statuses.php';
require __DIR__.'/api/priorities.php';
require __DIR__.'/api/tickets.php';
require __DIR__.'/api/routing.php';
require __DIR__.'/api/sla.php';
