<?php

use App\Http\Controllers\Api\V1\DepartmentController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:api', 'tenant.context'])->prefix('departments')->group(function () {
    Route::get('/', [DepartmentController::class, 'index']);
    Route::post('/', [DepartmentController::class, 'store']);
    Route::get('/{department}', [DepartmentController::class, 'show']);
    Route::put('/{department}', [DepartmentController::class, 'update']);
    Route::delete('/{department}', [DepartmentController::class, 'destroy']);
    Route::post('/{department}/users', [DepartmentController::class, 'assignUser']);
    Route::delete('/{department}/users/{user}', [DepartmentController::class, 'removeUser']);
});
