<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| DeskZeal's API is stateless and has no Blade frontend. This route
| exists only as a friendly landing point; everything else is served
| under /api/v1 (see routes/api.php). Developer documentation requires sign-in.
|
*/

Route::get('/', function () {
    return response()->json([
        'name' => config('app.name'),
        'status' => 'ok',
        'api' => url('/api/v1'),
        'docs' => url('/api/v1/developer-docs'),
    ]);
});

// Retire the former static URLs, including HTML, assets and reference exports.
Route::any('/docs/{path?}', fn () => abort(404))->where('path', '.*');
Route::any('/docs.openapi', fn () => abort(404));
Route::any('/docs.postman', fn () => abort(404));
