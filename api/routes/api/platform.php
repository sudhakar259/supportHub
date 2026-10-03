<?php

use App\Http\Controllers\Api\V1\Platform\DashboardController;
use App\Http\Controllers\Api\V1\Platform\MembershipPlanController;
use App\Http\Controllers\Api\V1\Platform\TenantController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:api', 'platform.admin'])->prefix('platform')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::get('/tenants', [TenantController::class, 'index']);
    Route::get('/tenants/{tenant}', [TenantController::class, 'show']);
    Route::put('/tenants/{tenant}', [TenantController::class, 'update']);
    Route::post('/tenants/{tenant}/suspend', [TenantController::class, 'suspend']);
    Route::post('/tenants/{tenant}/activate', [TenantController::class, 'activate']);

    Route::get('/membership-plans', [MembershipPlanController::class, 'index']);
    Route::post('/membership-plans', [MembershipPlanController::class, 'store']);
    Route::put('/membership-plans/{plan}', [MembershipPlanController::class, 'update']);
});
