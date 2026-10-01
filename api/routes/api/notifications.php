<?php

use App\Http\Controllers\Api\V1\NotificationPreferenceController;
use App\Http\Controllers\Api\V1\NotificationTemplateController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:api')->group(function () {
    Route::get('/notification-preferences', [NotificationPreferenceController::class, 'index']);
    Route::put('/notification-preferences', [NotificationPreferenceController::class, 'update']);

    Route::get('/notification-templates', [NotificationTemplateController::class, 'index']);
    Route::put('/notification-templates/{template}', [NotificationTemplateController::class, 'update']);
});
