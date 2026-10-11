<?php

use App\Http\Controllers\Api\V1\BrandingController;
use App\Http\Controllers\Api\V1\SystemSettingController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:api', 'tenant.context'])->group(function () {
    Route::get('/settings', [SystemSettingController::class, 'index']);
    Route::put('/settings', [SystemSettingController::class, 'update']);
    Route::get('/branding', [BrandingController::class, 'show']);
    Route::put('/branding', [BrandingController::class, 'update']);
});
