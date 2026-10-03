<?php

use App\Http\Controllers\Api\V1\CustomerController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:api', 'tenant.context'])->prefix('customers')->group(function () {
    Route::get('/', [CustomerController::class, 'index']);
    Route::post('/', [CustomerController::class, 'store']);
    Route::get('/{customer}', [CustomerController::class, 'show']);
    Route::put('/{customer}', [CustomerController::class, 'update']);
    Route::delete('/{customer}', [CustomerController::class, 'destroy']);
});
