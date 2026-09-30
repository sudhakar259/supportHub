<?php

use App\Http\Controllers\Api\V1\TicketPriorityController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:api')->apiResource('priorities', TicketPriorityController::class)
    ->parameters(['priorities' => 'priority']);
