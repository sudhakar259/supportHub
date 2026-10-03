<?php

use App\Http\Controllers\Api\V1\TicketStatusController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:api', 'tenant.context'])->apiResource('statuses', TicketStatusController::class)
    ->parameters(['statuses' => 'status']);
