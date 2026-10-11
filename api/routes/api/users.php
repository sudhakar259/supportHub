<?php

use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\UserImpersonationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:api', 'tenant.context'])->prefix('users')->group(function () {
    Route::get('/', [UserController::class, 'index']);
    Route::post('/', [UserController::class, 'store']);
    Route::get('/{user}', [UserController::class, 'show']);
    Route::put('/{user}', [UserController::class, 'update']);
    Route::delete('/{user}', [UserController::class, 'destroy']);
    Route::put('/{user}/roles', [UserController::class, 'syncRoles']);
    Route::post('/{user}/impersonate', [UserImpersonationController::class, 'store'])->name('users.impersonate');
});
