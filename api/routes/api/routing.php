<?php

use App\Http\Controllers\Api\V1\TicketRoutingRuleController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:api')->apiResource('routing-rules', TicketRoutingRuleController::class)
    ->parameters(['routing-rules' => 'rule']);
