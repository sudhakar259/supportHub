<?php

use App\Http\Controllers\Api\V1\ReportController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:api')->prefix('reports')->group(function () {
    Route::get('/tickets-summary', [ReportController::class, 'ticketSummary']);
    Route::get('/sla-compliance', [ReportController::class, 'slaCompliance']);
    Route::get('/agent-performance', [ReportController::class, 'agentPerformance']);
});
