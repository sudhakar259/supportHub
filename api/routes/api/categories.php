<?php

use App\Http\Controllers\Api\V1\TicketCategoryController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:api', 'tenant.context'])->apiResource('categories', TicketCategoryController::class)
    ->parameters(['categories' => 'category']);
