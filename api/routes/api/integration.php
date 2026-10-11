<?php

use App\Http\Controllers\Api\V1\Integration\CustomerController;
use App\Http\Controllers\Api\V1\Integration\LookupController;
use App\Http\Controllers\Api\V1\Integration\TicketController;
use Illuminate\Support\Facades\Route;

Route::middleware(['integration.auth', 'throttle:integration'])->prefix('integration')->group(function () {
    Route::middleware('scope:customers.read')->group(function () {
        Route::get('/customers', [CustomerController::class, 'index']);
        Route::get('/customers/lookup', [CustomerController::class, 'lookup']);
        Route::get('/customers/{customer}', [CustomerController::class, 'show']);
    });
    Route::middleware('scope:customers.create')->post('/customers', [CustomerController::class, 'store']);
    Route::middleware('scope:customers.update')->put('/customers/{customer}', [CustomerController::class, 'update']);

    Route::middleware('scope:tickets.read')->group(function () {
        Route::get('/ticket-options', [TicketController::class, 'options']);
        Route::get('/tickets', [TicketController::class, 'index']);
        Route::get('/tickets/{ticket}', [TicketController::class, 'show']);
        Route::get('/tickets/{ticket}/messages', [TicketController::class, 'messages']);
    });
    Route::middleware('scope:tickets.create')->group(function () {
        Route::get('/priorities', [LookupController::class, 'priorities']);
        Route::get('/departments', [LookupController::class, 'departments']);
        Route::get('/categories', [LookupController::class, 'categories']);
    });
    Route::middleware('scope:tickets.create')->post('/tickets', [TicketController::class, 'store'])->middleware('idempotent');
    Route::middleware('scope:tickets.update')->put('/tickets/{ticket}', [TicketController::class, 'update']);
    Route::middleware('scope:tickets.reply')->post('/tickets/{ticket}/messages', [TicketController::class, 'reply'])->middleware('idempotent');
    Route::middleware('scope:tickets.status.update')->post('/tickets/{ticket}/status', [TicketController::class, 'updateStatus'])->middleware('idempotent');
    Route::middleware('scope:tickets.reopen')->post('/tickets/{ticket}/reopen', [TicketController::class, 'reopen'])->middleware('idempotent');
    Route::middleware('scope:tickets.attachments')->group(function () {
        Route::get('/tickets/{ticket}/attachments', [TicketController::class, 'attachments']);
        Route::get('/tickets/{ticket}/attachments/{attachment}/download', [TicketController::class, 'downloadAttachment']);
        Route::post('/tickets/{ticket}/attachments', [TicketController::class, 'storeAttachment'])->middleware('idempotent');
    });
});
