<?php

use App\Http\Controllers\Api\V1\TicketPriorityController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:api', 'tenant.context'])->apiResource('priorities', TicketPriorityController::class)
    ->parameters(['priorities' => 'priority']);
