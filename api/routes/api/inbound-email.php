<?php

use App\Http\Controllers\Api\V1\InboundEmailController;
use App\Http\Controllers\Api\V1\InboundEmailWebhookController;
use Illuminate\Support\Facades\Route;

// Public: authenticated by Mailgun's signature, not a user token.
Route::middleware('throttle:300,1')->post('/inbound-email/mailgun', [InboundEmailWebhookController::class, 'mailgun']);

Route::middleware(['auth:api', 'tenant.context'])->prefix('inbound-email')->group(function () {
    Route::get('/', [InboundEmailController::class, 'show']);
    Route::put('/', [InboundEmailController::class, 'update']);
    Route::get('/log', [InboundEmailController::class, 'log']);
});
