<?php

use App\Http\Controllers\Api\V1\PermissionController;
use App\Http\Controllers\Api\V1\RoleController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:api')->group(function () {
    Route::apiResource('roles', RoleController::class);
    Route::get('/permissions', [PermissionController::class, 'index']);
});
