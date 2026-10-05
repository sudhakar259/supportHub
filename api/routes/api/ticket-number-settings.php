<?php

use App\Http\Controllers\Api\V1\TicketNumberSettingController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:api', 'tenant.context'])->prefix('ticket-number-settings')->group(function () {
    Route::get('/', [TicketNumberSettingController::class, 'index']);
    Route::post('/', [TicketNumberSettingController::class, 'store']);
});
