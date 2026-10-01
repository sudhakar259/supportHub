<?php

use App\Http\Controllers\Api\V1\SlaPolicyController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:api')->apiResource('sla-policies', SlaPolicyController::class)
    ->parameters(['sla-policies' => 'policy']);
