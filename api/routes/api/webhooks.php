<?php

use App\Http\Controllers\Api\V1\WebhookController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:api', 'tenant.context'])->prefix('webhooks')->group(function () {
    Route::get('/', [WebhookController::class, 'index']);
    Route::post('/', [WebhookController::class, 'store']);
    Route::get('/{webhook}', [WebhookController::class, 'show']);
    Route::put('/{webhook}', [WebhookController::class, 'update']);
    Route::delete('/{webhook}', [WebhookController::class, 'destroy']);
    Route::get('/{webhook}/deliveries', [WebhookController::class, 'deliveries']);
});
