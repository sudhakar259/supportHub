<?php

use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\ExportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:api', 'tenant.context'])->prefix('customers')->group(function () {
    Route::get('/', [CustomerController::class, 'index']);
    Route::post('/', [CustomerController::class, 'store']);
    Route::get('/{customer}', [CustomerController::class, 'show']);
    Route::get('/{customer}/export', [CustomerController::class, 'export'])->name('customers.export');
    Route::post('/{customer}/erase', [CustomerController::class, 'erase'])->name('customers.erase');
    Route::put('/{customer}', [CustomerController::class, 'update']);
    Route::delete('/{customer}', [CustomerController::class, 'destroy']);
});

Route::middleware(['auth:api', 'tenant.context'])->prefix('exports')->group(function () {
    Route::get('/tickets', [ExportController::class, 'tickets'])->name('exports.tickets');
    Route::get('/customers', [ExportController::class, 'customers'])->name('exports.customers');
});
