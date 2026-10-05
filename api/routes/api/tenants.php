<?php

use App\Http\Controllers\Api\V1\TenantController;
use Illuminate\Support\Facades\Route;

Route::prefix('tenants')->middleware('throttle:auth')->group(function () {
    Route::post('/register', [TenantController::class, 'register'])->name('tenants.register');
    Route::get('/lookup/{slug}', [TenantController::class, 'lookup'])->middleware('throttle:auth')->name('tenants.lookup');
});
