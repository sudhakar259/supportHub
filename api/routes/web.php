<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| DeskNu's API is stateless and has no Blade frontend. This route
| exists only as a friendly landing point; everything else is served
| under /api/v1 (see routes/api.php) and /docs (Scribe documentation).
|
*/

Route::get('/', function () {
    return response()->json([
        'name' => config('app.name'),
        'status' => 'ok',
        'api' => url('/api/v1'),
        'docs' => url('/docs'),
    ]);
});
